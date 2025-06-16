#!/bin/sh

# Check if NEXT_PUBLIC_API_URL is set
if [ -z "$NEXT_PUBLIC_API_URL" ]; then
    echo "Warning: NEXT_PUBLIC_API_URL is not set"
else
    echo "NEXT_PUBLIC_API_URL is set to: $NEXT_PUBLIC_API_URL"
fi

# Start the Next.js application
npm start 