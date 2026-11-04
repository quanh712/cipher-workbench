"""Optional same-origin frontend hosting for the production container."""

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse


def register_frontend(app: FastAPI, directory: str) -> None:
    root = Path(directory).resolve()
    if not (root / "index.html").is_file():
        raise RuntimeError("STATIC_DIR must contain a built frontend index.html")

    @app.get("/{path:path}", include_in_schema=False)
    async def frontend(path: str) -> FileResponse:
        # Never turn a missing API endpoint or a missing build asset into HTML.
        if path == "api" or path.startswith("api/"):
            raise HTTPException(status_code=404)
        target = (root / path).resolve()
        if not target.is_relative_to(root):
            raise HTTPException(status_code=404)
        if target.is_file():
            return FileResponse(target)
        if Path(path).suffix or path.startswith("assets/"):
            raise HTTPException(status_code=404)
        return FileResponse(root / "index.html", headers={"Cache-Control": "no-cache"})
