FROM ghcr.io/astral-sh/uv:alpine3.21

WORKDIR /app

# Create a non-root user
RUN adduser --disabled-password --gecos "" myuser

# Change ownership of /app to myuser
RUN chown -R myuser:myuser /app

# Switch to the non-root user
USER myuser

# Set up environment variables
ENV PATH="/home/myuser/.local/bin:$PATH"

COPY ./pyproject.toml ./uv.lock /app/

# Install ADK
RUN uv sync --locked

# Copy agent
COPY ./coordinator /app/coordinator

EXPOSE 8000

# Command to start the ADK API server
CMD ["uv", "run", "adk", "api_server", "--host", "0.0.0.0", "./", "--allow_origins", "*"]