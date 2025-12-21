# CASA WordPress Backend - Dockerfile for Google Cloud Run
FROM wordpress:php8.2-apache

# Install required PHP extensions and tools
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    unzip \
    mariadb-client \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) gd mysqli pdo pdo_mysql zip \
    && rm -rf /var/lib/apt/lists/*

# Install Cloud SQL Proxy for GCP
RUN curl -o /usr/local/bin/cloud_sql_proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.linux.amd64 \
    && chmod +x /usr/local/bin/cloud_sql_proxy

# Configure Apache for Cloud Run (use PORT env var)
RUN sed -i 's/80/${PORT}/g' /etc/apache2/sites-available/000-default.conf /etc/apache2/ports.conf

# Enable Apache modules
RUN a2enmod rewrite headers

# Set recommended PHP settings for production
RUN { \
    echo 'upload_max_filesize = 64M'; \
    echo 'post_max_size = 64M'; \
    echo 'max_execution_time = 300'; \
    echo 'memory_limit = 256M'; \
    } > /usr/local/etc/php/conf.d/custom.ini

# Copy CASA Enhanced plugin
COPY plugins/casa-enhanced /var/www/html/wp-content/plugins/casa-enhanced/

# Copy custom db.php drop-in for Cloud SQL socket support
COPY wp-content/db.php /var/www/html/wp-content/db.php

# Copy custom configuration files
COPY flush-rules.php /var/www/html/
COPY casa-fix.php /var/www/html/
COPY cleanup_database.php /var/www/html/

# Set proper permissions
RUN chown -R www-data:www-data /var/www/html

# Create entrypoint script for Cloud Run
COPY docker-entrypoint-gcp.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint-gcp.sh

# Cloud Run automatically sets PORT environment variable
EXPOSE 8080

ENTRYPOINT ["docker-entrypoint-gcp.sh"]
CMD ["apache2-foreground"]
