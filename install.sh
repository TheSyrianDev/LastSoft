#!/bin/sh
# Install Last AI on Linux.
#
#   curl -fsSL https://thesyriandev.github.io/LastSoft/install.sh | sh
#
# It reads /etc/os-release, picks the build that matches the distribution, and
# installs it: on Omarchy the Omarchy package (lastai-omarchy, the only build
# compiled with Omarchy's theme integration), on the other Arch distributions the
# plain Arch package, the .deb on Debian and its children, the .rpm on Fedora and
# SUSE, and the AppImage anywhere else. On Omarchy it then runs
# `lastai-omarchy-setup`, which is what makes the app follow the desktop theme.
#
#   --dry-run     print what would happen, download nothing
#   --appimage    skip the package managers and install the AppImage
#   --version TAG install a specific release tag instead of the newest
#   --no-setup    on Omarchy, do not run lastai-omarchy-setup
#   --uninstall   remove an AppImage installed by this script
#   --help        this text

set -eu

REPO="TheSyrianDev/LastAI"
SITE="https://thesyriandev.github.io/LastSoft"
OS_RELEASE="${OS_RELEASE:-/etc/os-release}"
API="https://api.github.com/repos/$REPO/releases"

DRY_RUN=0
FORCE_APPIMAGE=0
RUN_SETUP=1
UNINSTALL=0
VERSION=""

# ------------------------------------------------------------------ output
if [ -t 1 ] && [ -t 2 ]; then
  BOLD=$(printf '\033[1m'); DIM=$(printf '\033[2m')
  GREEN=$(printf '\033[32m'); YELLOW=$(printf '\033[33m')
  RED=$(printf '\033[31m'); OFF=$(printf '\033[0m')
else
  BOLD=""; DIM=""; GREEN=""; YELLOW=""; RED=""; OFF=""
fi

say()  { printf '%s\n' "$*"; }
step() { printf '%s==>%s %s\n' "$BOLD" "$OFF" "$*"; }
warn() { printf '%swarning:%s %s\n' "$YELLOW" "$OFF" "$*" >&2; }
die()  { printf '%serror:%s %s\n' "$RED" "$OFF" "$*" >&2; exit 1; }

usage() {
  cat <<'TEXT'
Install Last AI on Linux.

  curl -fsSL https://thesyriandev.github.io/LastSoft/install.sh | sh

It reads /etc/os-release, picks the build that matches the distribution, and
installs it: on Omarchy the Omarchy package (lastai-omarchy, the only build
compiled with Omarchy's theme integration), on the other Arch distributions the
plain Arch package, the .deb on Debian and its children, the .rpm on Fedora and
SUSE, and the AppImage anywhere else. On Omarchy it then runs
`lastai-omarchy-setup`, which is what makes the app follow the desktop theme.

  --dry-run     print what would happen, download nothing
  --appimage    skip the package managers and install the AppImage
  --version TAG install a specific release tag instead of the newest
  --no-setup    on Omarchy, do not run lastai-omarchy-setup
  --uninstall   remove an AppImage installed by this script
  --help        this text
TEXT
  exit 0
}

# ------------------------------------------------------------------- flags
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --appimage) FORCE_APPIMAGE=1 ;;
    --no-setup) RUN_SETUP=0 ;;
    --uninstall) UNINSTALL=1 ;;
    --version) shift; [ $# -gt 0 ] || die "--version needs a tag"; VERSION="$1" ;;
    --version=*) VERSION="${1#*=}" ;;
    --help|-h) usage ;;
    *) die "unknown option: $1 (try --help)" ;;
  esac
  shift
done

# ------------------------------------------------------------------ system
need_curl() {
  command -v curl >/dev/null 2>&1 || die "curl is required but not installed"
}

uname_s=$(uname -s 2>/dev/null || echo unknown)
uname_m=$(uname -m 2>/dev/null || echo unknown)
APPIMAGE_DEST="${HOME}/.local/bin/Last_AI.AppImage"

if [ "$UNINSTALL" -eq 1 ]; then
  if [ -f "$APPIMAGE_DEST" ]; then
    rm -f "$APPIMAGE_DEST"
    say "Removed $APPIMAGE_DEST"
    say "${DIM}If you installed a package instead, remove it with your package manager.${OFF}"
  else
    say "No AppImage found at $APPIMAGE_DEST"
  fi
  exit 0
fi

read_os_release() {
  [ -r "$OS_RELEASE" ] || { echo ""; return; }
  # shellcheck disable=SC1090
  (. "$OS_RELEASE" 2>/dev/null; echo "${ID:-} ${ID_LIKE:-} ${PRETTY_NAME:-} ${VERSION_ID:-}") || echo ""
}

os_info=$(read_os_release)
id=$(echo "$os_info" | awk '{print $1}')
like=$(echo "$os_info" | awk '{print $2}')
pretty=$(echo "$os_info" | cut -d' ' -f3-)
[ -n "$pretty" ] || pretty="$uname_s"

has() { printf '%s' "$1" | tr ' ' '\n' | grep -qx "$2"; }

# Omarchy says ID=omarchy, ID_LIKE=arch.
is_omarchy() {
  has "$id" omarchy || has "$like" omarchy && return 0
  # the marker only counts when we are reading this machine's own os-release
  [ "$OS_RELEASE" = "/etc/os-release" ] && [ -x /usr/share/omarchy/bin/omarchy ]
}

is_arch() {
  has "$id" arch || has "$id" manjaro || has "$id" endeavouros || \
  has "$id" garuda || has "$id" cachyos || has "$like" arch
}

is_debian() {
  has "$id" debian || has "$id" ubuntu || has "$id" linuxmint || has "$id" pop || \
  has "$id" elementary || has "$id" neon || has "$id" zorin || has "$id" raspbian || \
  has "$id" kali || has "$like" debian || has "$like" ubuntu
}

is_fedora() {
  has "$id" fedora || has "$id" rhel || has "$id" centos || has "$id" rocky || \
  has "$id" almalinux || has "$id" nobara || has "$id" bazzite || \
  has "$like" fedora || has "$like" rhel
}

is_suse() {
  case "$id" in opensuse*|suse*|sles) return 0 ;; esac
  has "$like" suse || has "$like" opensuse
}

# ------------------------------------------------------------- release data
need_curl

if [ -n "$VERSION" ]; then
  release_url="$API/tags/$VERSION"
else
  release_url="$API?per_page=1"
fi

step "Reading the release list from GitHub"
json=$(curl -fsSL -H 'Accept: application/vnd.github+json' "$release_url" 2>/dev/null) ||
  die "could not reach the GitHub API. Check your connection, or download from https://github.com/$REPO/releases"

tag=$(printf '%s' "$json" |
  grep -o '"tag_name"[[:space:]]*:[[:space:]]*"[^"]*"' |
  head -1 |
  sed 's/.*"\([^"]*\)"$/\1/')
[ -n "$tag" ] || die "no release found (the API returned nothing useful)"

urls=$(printf '%s' "$json" |
  grep -o '"browser_download_url"[^,]*' |
  sed 's/.*"\(https[^"]*\)".*/\1/')

# first asset whose name contains $1 and does not contain $2
pick() {
  printf '%s\n' "$urls" | while IFS= read -r u; do
    case "$u" in *"$1"*) ;; *) continue ;; esac
    if [ -n "${2:-}" ]; then case "$u" in *"$2"*) continue ;; esac; fi
    printf '%s\n' "$u"
    break
  done
}

deb_url=$(pick 'amd64.deb')
rpm_url=$(pick '-x86_64.rpm')
omarchy_url=$(pick 'LastAI-omarchy-' '')
pkg_url=$(pick 'pkg.tar.zst' 'omarchy')
appimage_url=$(pick '.AppImage')

say "${DIM}release:$OFF $tag"

# ---------------------------------------------------------------- the plan
target=""
if [ "$FORCE_APPIMAGE" -eq 1 ]; then
  target="appimage"
elif is_omarchy; then
  target="omarchy"
elif is_arch; then
  target="arch"
elif is_debian; then
  target="debian"
elif is_fedora; then
  target="fedora"
elif is_suse; then
  target="suse"
else
  target="appimage"
fi

case "$target" in
  omarchy)  what="the Omarchy package (lastai-omarchy), then lastai-omarchy-setup" ;;
  arch)     what="the Arch package" ;;
  debian)   what="the .deb package" ;;
  fedora)   what="the .rpm package" ;;
  suse)     what="the .rpm package" ;;
  appimage) what="the AppImage into ~/.local/bin" ;;
esac

say "    system: $pretty ($uname_s, $uname_m)"
[ "$target" = "omarchy" ] && say "    ${GREEN}Omarchy detected${OFF}"
say "    will install: $what"

if [ "$uname_s" != "Linux" ]; then
  die "this script installs on Linux only. For other systems see $SITE/downloads.html"
fi

if [ "$uname_m" != "x86_64" ] && [ "$uname_m" != "amd64" ]; then
  warn "the published builds are for x86_64; $uname_m may not run them"
fi

# sudo, but only when we need it and it exists
SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  if command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
  elif [ "$target" != "appimage" ]; then
    warn "no sudo and not root: falling back to the AppImage"
    target="appimage"
    what="the AppImage into ~/.local/bin"
  fi
fi

if [ "$DRY_RUN" -eq 1 ]; then
  say ""
  say "${BOLD}Dry run.${OFF} Nothing was downloaded or installed."
  case "$target" in
    debian)   say "  would run: ${SUDO:+$SUDO }apt-get install -y ./<release>.deb" ; url="$deb_url" ;;
    fedora)   say "  would run: ${SUDO:+$SUDO }dnf install -y ./<release>.rpm" ; url="$rpm_url" ;;
    suse)     say "  would run: ${SUDO:+$SUDO }zypper install -y --allow-unsigned-rpm ./<release>.rpm" ; url="$rpm_url" ;;
    arch)     say "  would run: ${SUDO:+$SUDO }pacman -U --noconfirm ./<release>.pkg.tar.zst" ; url="$pkg_url" ;;
    omarchy)  say "  would run: ${SUDO:+$SUDO }pacman -U --noconfirm ./<release>.pkg.tar.zst" ; url="${omarchy_url:-$pkg_url}" ;;
    appimage) say "  would run: install -Dm755 <release>.AppImage $APPIMAGE_DEST" ; url="$appimage_url" ;;
  esac
  say "  asset: ${url:-none found for this release}"
  [ "$target" = "omarchy" ] && say "  then:  lastai-omarchy-setup"
  exit 0
fi

# ------------------------------------------------------------- download it
case "$target" in
  debian) url="$deb_url"; ext="deb" ;;
  fedora|suse) url="$rpm_url"; ext="rpm" ;;
  arch) url="$pkg_url"; ext="pkg.tar.zst" ;;
  omarchy)
    url="${omarchy_url:-$pkg_url}"; ext="pkg.tar.zst"
    [ -n "$omarchy_url" ] || warn "release $tag has no lastai-omarchy package; the Arch package in it already includes the integration"
    ;;
  appimage) url="$appimage_url"; ext="AppImage" ;;
esac

[ -n "$url" ] || die "release $tag has no asset for this system. See https://github.com/$REPO/releases"

tmpdir=$(mktemp -d "${TMPDIR:-/tmp}/lastai-install.XXXXXX")
cleanup() { rm -rf "$tmpdir"; }
trap cleanup EXIT INT TERM

file="$tmpdir/$(basename "$url")"

step "Downloading $(basename "$url")"
curl -fL --retry 3 --progress-bar -o "$file" "$url" || die "download failed"

size=$(wc -c < "$file" | tr -d ' ')
[ "$size" -gt 1000000 ] || die "the download looks wrong ($size bytes)"

# -------------------------------------------------------------- install it
case "$target" in
  debian)
    step "Installing with apt"
    if command -v apt-get >/dev/null 2>&1; then
      $SUDO apt-get install -y "$file" || die "apt could not install the package"
    else
      $SUDO dpkg -i "$file" || { $SUDO apt-get -f install -y; }
    fi
    ;;
  fedora)
    step "Installing with dnf"
    if command -v dnf >/dev/null 2>&1; then
      $SUDO dnf install -y "$file" || die "dnf could not install the package"
    else
      $SUDO rpm -i "$file" || die "rpm could not install the package"
    fi
    ;;
  suse)
    step "Installing with zypper"
    $SUDO zypper --non-interactive install --allow-unsigned-rpm "$file" ||
      die "zypper could not install the package"
    ;;
  arch|omarchy)
    step "Installing with pacman"
    $SUDO pacman -U --noconfirm "$file" || die "pacman could not install the package"
    ;;
  appimage)
    step "Installing the AppImage"
    mkdir -p "$(dirname "$APPIMAGE_DEST")"
    install -m 755 "$file" "$APPIMAGE_DEST"
    case ":$PATH:" in
      *":$HOME/.local/bin:"*) ;;
      *) warn "$HOME/.local/bin is not on your PATH; add it to run Last AI by name" ;;
    esac
    say "    installed: $APPIMAGE_DEST"
    ;;
esac

# ------------------------------------------------------------ omarchy step
if [ "$target" = "omarchy" ] && [ "$RUN_SETUP" -eq 1 ]; then
  if command -v lastai-omarchy-setup >/dev/null 2>&1; then
    step "Running lastai-omarchy-setup"
    lastai-omarchy-setup || warn "lastai-omarchy-setup did not finish; run it yourself later"
  else
    warn "lastai-omarchy-setup was not found after installing"
  fi
fi

say ""
say "${GREEN}Last AI $tag is installed.${OFF}"
case "$target" in
  appimage) say "  start it: $APPIMAGE_DEST" ;;
  *)        say "  start it: la            ${DIM}(or lastai-gui for the desktop app)${OFF}" ;;
esac
say "  ${DIM}first run asks twelve questions, Enter accepts each default${OFF}"
