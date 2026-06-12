FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install git for dependency resolution
RUN apk add --no-cache git

# Copy dependency files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build a statically linked binary
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server cmd/main.go

FROM alpine:latest

# Install essential utilities
RUN apk --no-cache add ca-certificates tzdata curl

# Hugging Face Spaces environment requirements
RUN adduser -D -u 1000 user
WORKDIR /home/user/app

# Copy the binary
COPY --from=builder /app/server .
RUN chown user:user server && chmod +x server

USER user

# Port configuration
ENV PORT=7860
EXPOSE 7860

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:7860/ || exit 1

# Start the server
CMD ["./server"]
