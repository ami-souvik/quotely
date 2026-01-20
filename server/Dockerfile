# Use an official Python runtime as a parent image
FROM python:3.11-slim-bookworm

# Set the working directory in the container
WORKDIR /app

# Install system dependencies required by WeasyPrint
# libpango, libpangocairo, libgdk-pixbuf, libcairo, libffi-dev, shared-mime-info
RUN apt-get update && apt-get install -y \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libharfbuzz-gobject0 \
    libgdk-pixbuf-2.0-0 \
    libcairo-gobject2 \
    libffi-dev \
    shared-mime-info \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy the current directory contents into the container at /app
COPY requirements.txt /app/

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your application's code
COPY . /app/

# Expose port 8000 for Gunicorn
EXPOSE 8000

# Run gunicorn to serve the Django application
# 'config.wsgi:application' refers to your project's WSGI file
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000"]
