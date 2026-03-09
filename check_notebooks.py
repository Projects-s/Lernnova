
import asyncio
import os
import sys
from notebooklm import NotebookLMClient

async def check():
    try:
        async with await NotebookLMClient.from_storage() as client:
            notebooks = await client.notebooks.list()
            print("--- LERNOVA NOTEBOOKS ---")
            found = False
            for nb in notebooks:
                if nb.title.startswith("Lernova"):
                    print(f"- {nb.title} ({nb.id})")
                    found = True
            if not found:
                print("No Lernova notebooks found.")
    except Exception as e:
        print(f"Error checking notebooks: {e}")

if __name__ == "__main__":
    asyncio.run(check())
