# 多阶段构建：先编译再运行
# 如果 Docker Hub 访问慢/失败，可将 FROM 镜像替换为国内镜像，例如：
#   FROM docker.m.daocloud.io/library/maven:3.9-eclipse-temurin-17 AS builder
#   FROM docker.m.daocloud.io/library/eclipse-temurin:17-jdk
FROM maven:3.9-eclipse-temurin-17 AS builder

WORKDIR /app

# 依赖单独成一层。
#
# 原先是 COPY pom.xml + COPY src + RUN mvn package 三段连着，注释还写着「先复制依赖描述
# 文件，利用 Docker 缓存」——但 src 就在同一个 RUN 之前拷进来，任何一行源码改动都会让
# 这一层失效、整棵依赖树重下（NAS 上实测十几分钟，且中途一次超时就整次部署失败）。
#
# 拆成「先只拷 pom.xml 把依赖拉下来」之后，这一层只在 pom.xml 变化时重建；
# 日常改源码只需重跑最后那次 package。
#
# 这里刻意不用 RUN --mount=type=cache：需要 BuildKit，NAS 上的 Docker 版本不保证支持，
# 一旦不支持就是构建直接失败——比慢更糟。普通层缓存已经够用。
COPY pom.xml ./
# `|| true`：这一步的唯一目的是把依赖预热进缓存层，本身不是构建的验收条件。
# 它若因为某个 plugin 解析不到而失败，让整次部署就此中断是不划算的——
# 真正的构建在下面那次 package，缺什么它会自己补下载。
RUN mvn -B -q dependency:go-offline || true

COPY src ./src

# 打包（跳过测试，加快构建）
RUN mvn -B clean package -DskipTests

# 运行时镜像
FROM eclipse-temurin:17-jdk

WORKDIR /app

# 从构建阶段复制 jar
COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
