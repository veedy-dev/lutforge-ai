#!/bin/sh

# Check if NEXT_PUBLIC_API_URL is set
if [ -z "$NEXT_PUBLIC_API_URL" ]; then
    echo "Warning: NEXT_PUBLIC_API_URL is not set"
else
    echo "NEXT_PUBLIC_API_URL is set to: $NEXT_PUBLIC_API_URL"
fi

# Export the environment variable to make it available during runtime
export NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL"

# Create a runtime config file for the API endpoint to use
echo "{\"apiUrl\":\"$NEXT_PUBLIC_API_URL\"}" > /app/public/runtime-config.json

# Start the Next.js application
npm start 