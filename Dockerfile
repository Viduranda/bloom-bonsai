# 🌿 BLOOM & BONSAI — Production Dockerfile for PHP + PyTorch AI Model
FROM php:8.2-apache

# 1. Install system dependencies & Python 3
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    libpng-dev \
    libjpeg62-turbo-dev \
    libfreetype6-dev \
    git \
    unzip \
    && rm -rf /var/lib/apt-get/lists/*

# 2. Install PHP MySQL extensions
RUN docker-php-ext-install pdo pdo_mysql gd

# 3. Enable Apache rewrite module
RUN a2enmod rewrite

# 4. Install Python PyTorch & Transformers dependencies
RUN pip3 install --no-cache-dir --break-system-packages \
    torch \
    torchvision \
    pillow \
    transformers

# 5. Set working directory to Apache root
WORKDIR /var/www/html

# 6. Copy project source code into container
COPY . /var/www/html/

# 7. Grant Apache permissions
RUN chown -R www-data:www-data /var/www/html

# Expose port 80
EXPOSE 80

CMD ["apache2-foreground"]
