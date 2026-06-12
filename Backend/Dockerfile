FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install git which is required for go mod download
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main cmd/main.go

FROM alpine:latest

# Install ca-certificates and timezone data
RUN apk --no-cache add ca-certificates tzdata

# Create a non-root user for Hugging Face
RUN adduser -D -u 1000 user
USER user
WORKDIR /home/user/app

# Copy the binary from builder stage
COPY --from=builder /app/main .

# Ensure the binary is executable
# COPY (as user) should preserve permissions if builder stage allowed it, 
# but let's be explicit if needed.

# Expose port 7860 (Hugging Face default)
ENV PORT=7860
EXPOSE 7860

# Run the binary
CMD ["./main"]
