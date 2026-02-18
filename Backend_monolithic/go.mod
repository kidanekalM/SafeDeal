module backend_monolithic

go 1.21

require (
    github.com/ethereum/go-ethereum v1.16.2
    github.com/go-playground/validator/v10 v10.11.1
    github.com/gofiber/websocket/v2 v2.6.0
    github.com/gofiber/fiber/v2 v2.52.0
    github.com/gofiber/jwt/v2 v2.8.2
    github.com/golang-jwt/jwt/v5 v5.2.2
    github.com/google/uuid v1.6.0
    github.com/joho/godotenv v1.5.1
    github.com/streadway/amqp v1.1.0
    golang.org/x/crypto v0.21.0
    golang.org/x/net v0.23.0
    google.golang.org/grpc v1.73.0
    google.golang.org/protobuf v1.36.6
    gopkg.in/gomail.v2 v2.0.0-20160411212932-81ebce5c23df
    gorm.io/driver/postgres v1.6.0
    gorm.io/gorm v1.25.6
)

replace (
    github.com/dgrijalva/jwt-go => github.com/golang-jwt/jwt/v4 v4.5.0
)