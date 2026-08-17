FROM golang:1.24-alpine AS builder
WORKDIR /app
RUN apk add --no-cache git
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server cmd/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates tzdata

# Create a non-root user with UID 1000 for Hugging Face Spaces compatibility
RUN adduser -D -u 1000 user
WORKDIR /home/user/app

# Copy the binary and ensure user ownership so the app has permission to write local SQLite fallback DB
COPY --from=builder /app/server .
RUN chown -R user:user /home/user/app && chmod +x server

# Switch to the non-root user
USER user

# Set environment variables and expose port 7860 (Hugging Face default)
ENV PORT=7860
EXPOSE 7860

CMD ["./server"]
