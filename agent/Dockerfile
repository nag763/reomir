FROM python:3.12-slim

WORKDIR /app

# Create a non-root user
RUN adduser --disabled-password --gecos "" myuser

# Change ownership of /app to myuser
RUN chown -R myuser:myuser /app

# Switch to the non-root user
USER myuser

# Set up environment variables
ENV PATH="/home/myuser/.local/bin:$PATH"

# Install ADK
RUN pip install google-adk

# Copy agent
COPY ./waving_agent /app/waving_agent

# Set environment variables for Google Cloud
ENV GOOGLE_GENAI_USE_VERTEXAI=1
ENV GOOGLE_CLOUD_PROJECT=reomir
ENV GOOGLE_CLOUD_LOCATION=europe-west1

EXPOSE 8000

# Command to start the ADK API server
CMD ["adk", "api_server", "--host", "0.0.0.0", "./"]