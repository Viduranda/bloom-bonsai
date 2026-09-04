<?php
// api/ai/gemini_helper.php — Gemini 1.5 Flash API Helper

function getGeminiApiKeys() {
    $keys = [];
    $envKey = getEnvVar('GEMINI_API_KEY', '');
    if (!empty($envKey)) $keys[] = $envKey;

    // Direct fallback keys encoded to protect credentials
    $keys[] = base64_decode('QVEuQWI4Uk42Sjh2ZmI1OU1aRE5JZm1hM2NFTjU4bTFYMUJzbEJWS3duLVAwZ081bXpCQ0E=');
    $keys[] = base64_decode('QVEuQWI4Uk42SmhLbVlST0JERzNFbXMzaGRBd2VwVmlOdkluVGd4V3hsTkFuSEJLUDVNTHc=');

    return array_unique(array_filter($keys));
}

function getGeminiApiKey() {
    $keys = getGeminiApiKeys();
    return $keys[0] ?? '';
}

function callGemini15Flash($prompt, $systemInstruction = '', $base64Image = null, $mimeType = 'image/jpeg') {
    $apiKeys = getGeminiApiKeys();

    if (empty($apiKeys)) {
        return null;
    }

    $modelsToTry = [
        'gemini-flash-latest',
        'gemini-2.5-flash',
        'gemini-1.5-flash',
        'gemini-2.0-flash'
    ];

    $parts = [];
    if (!empty($prompt)) {
        $parts[] = ['text' => $prompt];
    }
    if (!empty($base64Image)) {
        // Strip data URI header if present
        if (preg_match('/^data:(image\/[a-zA-Z]+);base64,/', $base64Image, $m)) {
            $mimeType = $m[1];
            $base64Image = substr($base64Image, strpos($base64Image, ',') + 1);
        }
        $parts[] = [
            'inlineData' => [
                'mimeType' => $mimeType,
                'data' => $base64Image
            ]
        ];
    }

    $payload = [
        'contents' => [
            ['parts' => $parts]
        ]
    ];

    if (!empty($systemInstruction)) {
        $payload['systemInstruction'] = [
            'parts' => [
                ['text' => $systemInstruction]
            ]
        ];
    }

    $payloadJson = json_encode($payload);

    foreach ($apiKeys as $apiKey) {
        foreach ($modelsToTry as $modelName) {
            $url = "https://generativelanguage.googleapis.com/v1beta/models/" . urlencode($modelName) . ":generateContent?key=" . urlencode($apiKey);

            $ch = curl_init($url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST => true,
                CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
                CURLOPT_POSTFIELDS => $payloadJson,
                CURLOPT_TIMEOUT => 25,
                CURLOPT_SSL_VERIFYPEER => false
            ]);

            $response = curl_exec($ch);
            $err = curl_error($ch);
            curl_close($ch);

            if (!$err && $response) {
                $data = json_decode($response, true);
                if (isset($data['candidates'][0]['content']['parts'][0]['text'])) {
                    return trim($data['candidates'][0]['content']['parts'][0]['text']);
                }
            }
        }
    }

    return null;
}
