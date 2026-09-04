<?php
// api/ai/gemini_helper.php — Gemini 1.5 Flash API Helper

function getGeminiApiKey() {
    return getEnvVar('GEMINI_API_KEY', '');
}

function callGemini15Flash($prompt, $systemInstruction = '', $base64Image = null, $mimeType = 'image/jpeg') {
    $apiKey = getGeminiApiKey();

    if (empty($apiKey)) {
        return null;
    }

    $modelsToTry = [
        'gemini-1.5-flash',
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-flash-latest'
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

    return null;
}
