# 多阶段构建：先编译再运行
# 如果 Docker Hub 访问慢/失败，可将 FROM 镜像替换为国内镜像，例如：
#   FROM docker.m.daocloud.io/library/maven:3.9-eclipse-temurin-17 AS builder
#   FROM docker.m.daocloud.io/library/eclipse-temurin:17-jdk
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /app

# 先复制依赖描述文件，利用 Docker 缓存
COPY pom.xml ./
COPY src ./src

# 打包（跳过测试，加快构建）
RUN mvn clean package -DskipTests

# 运行时镜像
FROM eclipse-temurin:17-jdk

WORKDIR /app

# 从构建阶段复制 jar
COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
