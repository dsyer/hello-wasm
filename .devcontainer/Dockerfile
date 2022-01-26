# See here for image contents: https://github.com/microsoft/vscode-dev-containers/tree/v0.209.6/containers/ubuntu/.devcontainer/base.Dockerfile

# [Choice] Ubuntu version (use hirsuite or bionic on local arm64/Apple Silicon): hirsute, focal, bionic
ARG VARIANT="hirsute"
FROM mcr.microsoft.com/vscode/devcontainers/base:0-${VARIANT}

# [Optional] Uncomment this section to install additional OS packages.
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends xz-utils

# Install Nix 2.4pre20210126.
ARG NIX_INSTALL_SCRIPT=https://nixos.org/nix/install
RUN curl -L ${NIX_INSTALL_SCRIPT} | sudo -u vscode sh
RUN echo 'if [ -e ${HOME}/.nix-profile/etc/profile.d/nix.sh ]; then . ${HOME}/.nix-profile/etc/profile.d/nix.sh; fi' >> /etc/bash.bashrc

ENV USER=vscode

# Rebuilding the container should not throw the Nix store away so we make /nix
# a volume. See `devcontainer.json` later.
VOLUME /nix
