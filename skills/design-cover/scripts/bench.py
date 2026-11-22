"""Shared physical bookbinding bench tools for bespoke SVG covers.

Only the physical book object is shared here: the board edge bevel, spine hinge
groove, soft light falloff, and subtle paper/linen grain. Every book's
composition, palette, typography, and centerpiece illustration is bespoke.
"""
import math
import os
import random

SERIF = "'Playfair Display', 'Bodoni 72', 'Didot', 'Baskerville', 'Georgia', serif"
BOOK = "'Merriweather', 'Baskerville', 'Hoefler Text', 'Georgia', serif"
SANS = "'Inter', 'Avenir Next', 'Futura', 'Helvetica Neue', sans-serif"
MONO = "'JetBrains Mono', 'Menlo', 'Courier New', monospace"


def esc(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def f(x: float) -> str:
    """Compact coordinate formatter."""
    s = f"{x:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def grain_defs(prefix: str, freq: float = 0.9, alpha: float = 0.10, seed: int = 3, linen: bool = False) -> str:
    """Subtle SVG noise filter adding fine paper or woven linen grain."""
    if linen:
        turb = (
            f'<feTurbulence type="fractalNoise" baseFrequency="0.9 0.04" '
            f'numOctaves="2" seed="{seed}" result="n1"/>'
            f'<feTurbulence type="fractalNoise" baseFrequency="0.04 0.9" '
            f'numOctaves="2" seed="{seed + 1}" result="n2"/>'
            f'<feBlend in="n1" in2="n2" mode="multiply" result="n"/>'
        )
    else:
        turb = (
            f'<feTurbulence type="fractalNoise" baseFrequency="{freq}" '
            f'numOctaves="3" seed="{seed}" result="n"/>'
        )
    return (
        f'<filter id="{prefix}grain" x="0" y="0" width="100%" height="100%">'
        f"{turb}"
        f'<feColorMatrix in="n" type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.5  '
        f'0 0 0 0 0.5  0 0 0 {alpha * 6:.3f} -{alpha * 2.4:.3f}"/>'
        f'<feComposite in2="SourceGraphic" operator="in"/>'
        f"</filter>"
    )


def grain_layer(prefix: str, clip: str | None = None) -> str:
    c = f' clip-path="url(#{clip})"' if clip else ""
    return (
        f'<rect x="0" y="0" width="300" height="450" fill="#808080" '
        f'filter="url(#{prefix}grain)" style="mix-blend-mode:overlay"{c}/>'
    )


def board(prefix: str, hinge: int = 17, light: float = 0.10, shade: float = 0.55) -> str:
    """Physical book cover finishing: spine hinge groove, board bevel, and soft falloff."""
    return f"""
<defs>
  <linearGradient id="{prefix}hinge" x1="0" x2="1" y1="0" y2="0">
    <stop offset="0" stop-color="#000" stop-opacity="{shade}"/>
    <stop offset="0.35" stop-color="#000" stop-opacity="{shade * 0.35:.3f}"/>
    <stop offset="0.72" stop-color="#fff" stop-opacity="{light * 0.6:.3f}"/>
    <stop offset="0.86" stop-color="#000" stop-opacity="{shade * 0.55:.3f}"/>
    <stop offset="1" stop-color="#000" stop-opacity="0"/>
  </linearGradient>
  <radialGradient id="{prefix}falloff" cx="0.58" cy="0.36" r="0.85">
    <stop offset="0.55" stop-color="#000" stop-opacity="0"/>
    <stop offset="1" stop-color="#000" stop-opacity="0.38"/>
  </radialGradient>
</defs>
<rect x="0" y="0" width="300" height="450" fill="url(#{prefix}falloff)"/>
<rect x="0" y="0" width="{hinge}" height="450" fill="url(#{prefix}hinge)"/>
<rect x="0" y="0" width="300" height="450" fill="none" stroke="#000" stroke-opacity="0.55" stroke-width="1.6"/>
<rect x="1.2" y="1.2" width="297.6" height="447.6" fill="none" stroke="#fff" stroke-opacity="{light:.3f}" stroke-width="0.6"/>
<path d="M300 0 V450" stroke="#000" stroke-opacity="0.35" stroke-width="2.2"/>
<path d="M0 449 H300" stroke="#000" stroke-opacity="0.4" stroke-width="2"/>
"""


def wrap_svg(prefix: str, title: str, desc: str, body: str) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450" '
        f'width="300" height="450" role="img" aria-labelledby="{prefix}title {prefix}desc">\n'
        f'<title id="{prefix}title">{esc(title)}</title>\n'
        f'<desc id="{prefix}desc">{esc(desc)}</desc>\n'
        f"{body}\n</svg>\n"
    )


def write_cover(out_path: str, svg_text: str) -> None:
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write(svg_text)


def rng(seed: int) -> random.Random:
    return random.Random(seed)


def polar(cx: float, cy: float, r: float, deg: float) -> tuple[float, float]:
    a = math.radians(deg)
    return cx + r * math.cos(a), cy + r * math.sin(a)
