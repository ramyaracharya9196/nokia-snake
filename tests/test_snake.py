import subprocess
import time
import socket
import sys
from playwright.sync_api import sync_playwright

def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('localhost', port)) == 0

def run_tests():
    server_process = None
    
    port = 8080
    
    # Start the local python http server if the port is free
    if not is_port_in_use(port):
        print("Starting local Python HTTP server on port 8080...")
        server_process = subprocess.Popen(
            ["py", "-m", "http.server", str(port)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            cwd="c:\\Users\\RAMYA R ACHARYA\\.antigravity-ide\\snake game"
        )
        time.sleep(2.0)  # Wait for server to spin up
    else:
        print("Port 8080 is already in use; assuming existing dev server is active.")

    success = False
    try:
        with sync_playwright() as p:
            print("Launching headless Chromium browser...")
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            
            print("Navigating to game URL (http://localhost:8080)...")
            page.goto("http://localhost:8080")
            
            # Test UI structure rendering
            print("Verifying Nokia 3310 phone mockup elements...")
            assert page.locator(".nokia-phone").is_visible(), "Nokia phone casing is not rendered"
            assert page.locator(".brand-header").inner_text() == "NOKIA", "Brand logo text is incorrect"
            assert page.locator("#screen").is_visible(), "LCD Screen is not visible"
            assert page.locator("#menu-screen").is_visible(), "Initial menu screen is not visible"
            
            # Start the game
            print("Pressing '5' to start the game from menu...")
            page.press("body", "5")
            time.sleep(0.5)
            
            # Validate game state
            state = page.evaluate("window.getGameState()")
            print(f"Game Started State: {state}")
            assert state["gameRunning"] is True, "Game loop is not active"
            assert state["currentView"] == "game", "Screen is not displaying the gameplay layout"
            
            # Turn Snake downwards (Direction change test)
            print("Pressing '8' to turn snake DOWN...")
            page.press("body", "8")
            time.sleep(0.3)
            
            state_after_turn = page.evaluate("window.getGameState()")
            print(f"State after direction change: {state_after_turn}")
            
            # Make sure it registered y-axis movement downwards
            head = state_after_turn["snake"][0]
            assert head["y"] > 7, f"Snake head did not move downwards. Head: {head}"
            
            # Let it run until it hits the boundary
            print("Waiting for collision with bottom wall...")
            time.sleep(2.5)
            
            state_after_collision = page.evaluate("window.getGameState()")
            print(f"State after collision: {state_after_collision}")
            assert state_after_collision["gameRunning"] is False, "Game loop is still active after collision"
            assert state_after_collision["currentView"] == "gameover", "Screen is not showing game over menu"
            
            print("All test assertions passed successfully!")
            success = True
            browser.close()
            
    except Exception as e:
        print(f"Test execution failed: {e}", file=sys.stderr)
        
    finally:
        if server_process:
            print("Shutting down local HTTP server...")
            server_process.terminate()
            server_process.wait()
            
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    run_tests()
