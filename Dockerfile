# syntax=docker/dockerfile:1

# ---- Build stage ---------------------------------------------------------------------------
# Compiles the simulator to WebAssembly and builds the static site (simulator and documentation).
# The output does not depend on the CPU architecture, so this stage always runs natively on the
# build machine.
FROM --platform=$BUILDPLATFORM node:24-bookworm-slim AS build

ENV RUSTUP_HOME=/usr/local/rustup \
    CARGO_HOME=/usr/local/cargo \
    PATH=/usr/local/cargo/bin:$PATH

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl gcc libc6-dev \
    && rm -rf /var/lib/apt/lists/* \
    && curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
        | sh -s -- -y --profile minimal --default-toolchain none

WORKDIR /src

# Install the toolchain declared in rust-toolchain.toml (including the wasm target).
COPY rust-toolchain.toml ./
RUN rustup toolchain install

COPY package.json package-lock.json ./
COPY web/package.json web/
COPY docs/package.json docs/
RUN npm ci

COPY Cargo.toml Cargo.lock ./
COPY crates crates
COPY scripts scripts
COPY web web
COPY docs docs

# Origin and path under which the site is served (see the deployment documentation). SITE_URL is
# used for the absolute URLs in the documentation's sitemap.
ARG SITE_URL=http://localhost:8080
ARG SITE_BASE_PATH=/
ENV SITE_URL=$SITE_URL \
    SITE_BASE_PATH=$SITE_BASE_PATH
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/src/target \
    npm run build

# ---- Runtime stage -------------------------------------------------------------------------
# A plain static file server; the simulator runs entirely in the browser.
FROM nginxinc/nginx-unprivileged:1.31-alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
