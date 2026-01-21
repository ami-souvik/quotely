# Use an official Python runtime as a parent image
FROM python:3.11-slim-bookworm

# Add AWS Lambda Web Adapter
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.7.0 /lambda-adapter /opt/extensions/lambda-adapter

# Set the working directory in the container
WORKDIR /app

# 1. Install Runtime Dependencies (Keep these)
# These are required by WeasyPrint and must remain in the image
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libharfbuzz-gobject0 \
    libgdk-pixbuf-2.0-0 \
    libcairo-gobject2 \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage cache
COPY requirements.txt /app/

# 2. Install Build Deps, Pip Install, Remove Build Deps (All in ONE layer)
# This ensures build tools don't take up space in the final image layer history
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libffi-dev \
    && pip install --no-cache-dir -r requirements.txt \
    && apt-get purge -y --auto-remove build-essential libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy the rest of your application's code
COPY . /app/

# Expose port 8080 for Lambda Adapter
EXPOSE 8080

# Run gunicorn serving on 8080
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8080"]
