from fastapi import FastAPI, HTTPException
import subprocess

app = FastAPI()

@app.get("/{action}")
def change_connection(action: str):

    script_path = "~/.mongodb-edge/bin/edgectl offline-demo"
    
    allowed_actions = ["enable-connection", "disable-connection"]
    if action not in allowed_actions:
        raise HTTPException(status_code=400, detail="Invalid action")

    try:
        result = subprocess.run([script_path, action], capture_output=True, text=True, check=True)
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Failed to execute script: {e}")

    return {"message": f"Executed action: {action}", "output": result.stdout}
