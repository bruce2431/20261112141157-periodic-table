from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"

def build():
    # Clean merged source files if rebuilding from clean layout or initial split parts
    if (SRC / "style1.css").exists():
        css = (SRC / "style1.css").read_text("utf-8") + "\n" + (SRC / "style2.css").read_text("utf-8")
        (SRC / "styles.css").write_text(css, "utf-8")
    else:
        css = (SRC / "styles.css").read_text("utf-8")

    if (SRC / "data1.js").exists():
        d2 = (SRC / "data2.js").read_text("utf-8").replace('"オスミウム"==="x"?"": "锇"', '"锇"')
        data_js = (SRC / "data1.js").read_text("utf-8") + "\n" + d2
        (SRC / "data.js").write_text(data_js, "utf-8")
    else:
        data_js = (SRC / "data.js").read_text("utf-8")

    colormaps_js = (SRC / "colormaps.js").read_text("utf-8")

    if (SRC / "app1.js").exists():
        app_js = "\n".join((SRC / f"app{i}.js").read_text("utf-8") for i in (1, 2, 3))
        (SRC / "app.js").write_text(app_js, "utf-8")
    else:
        app_js = (SRC / "app.js").read_text("utf-8")

    tpl = (SRC / "template.html").read_text("utf-8")

    # 1) Standalone single-file index.html
    standalone = tpl.replace("<!-- __STYLES__ -->", f"<style>\n{css}\n</style>").replace(
        "<!-- __SCRIPTS__ -->",
        f"<script>\n{data_js}\n{colormaps_js}\n{app_js}\n</script>"
    )
    (ROOT / "index.html").write_text(standalone, "utf-8")

    # 2) Modular dev.html referencing src/*
    modular = tpl.replace("<!-- __STYLES__ -->", '<link rel="stylesheet" href="src/styles.css" />').replace(
        "<!-- __SCRIPTS__ -->",
        '<script src="src/data.js"></script>\n  <script src="src/colormaps.js"></script>\n  <script src="src/app.js"></script>'
    )
    (ROOT / "dev.html").write_text(modular, "utf-8")
    print("Built index.html and dev.html successfully.")

if __name__ == "__main__":
    build()
