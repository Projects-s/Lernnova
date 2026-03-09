
import asyncio
import os
import json
import logging
from notebooklm import NotebookLMClient
from typing import Dict, Any

logger = logging.getLogger(__name__)

def save_generation_meta(output_path: str, meta_data: dict):
    """Save metadata about a generation task to a sidecar JSON file."""
    meta_path = f"{output_path}.meta.json"
    try:
        # Load existing if any to merge
        existing = {}
        if os.path.exists(meta_path):
            with open(meta_path, 'r') as f:
                existing = json.load(f)
        
        existing.update(meta_data)
        with open(meta_path, 'w') as f:
            json.dump(existing, f, indent=4)
    except Exception as e:
        logger.error(f"Failed to save meta: {e}")

def get_generation_meta(output_path: str) -> dict:
    """Read metadata for a generation task."""
    meta_path = f"{output_path}.meta.json"
    if os.path.exists(meta_path):
        try:
            with open(meta_path, 'r') as f:
                return json.load(f)
        except:
            return {}
    return {}

async def generate_notebooklm_artifact(roadmap_data: Dict[str, Any], output_path: str, artifact_type: str = "audio", user_profile: Dict[str, Any] = None, user_id: str = "unknown"):
    """
    Generates a NotebookLM artifact (audio or video) from roadmap data.
    artifact_type: "audio" or "video"
    """
    print(f"\n[🚀 STARTING {artifact_type.upper()} GENERATION]")
    print(f"   - User: {user_id}")
    print(f"   - Goal: {roadmap_data.get('careerGoal')}")
    # 1. Format the roadmap and user profile into a context summary
    goal = roadmap_data.get("careerGoal", "Career Journey")
    reason = roadmap_data.get("reason", "")
    steps = roadmap_data.get("steps", [])
    
    # Extract unique roadmap ID (use a hash of the goal if ID is missing to prevent collisions)
    import hashlib
    roadmap_id = roadmap_data.get("id")
    if not roadmap_id:
        goal_text = roadmap_data.get("careerGoal", "temp")
        roadmap_id = hashlib.md5(goal_text.encode()).hexdigest()[:10]

    # STRICT ISOLATION: Title includes both User ID and Roadmap ID
    target_notebook_title = f"Lernova_{user_id}_{roadmap_id}"
    
    # Extract user profile context
    personality_context = ""
    if user_profile:
        interests = user_profile.get("interests", [])
        skills = user_profile.get("skills", [])
        personality_context = f"\nUser Interests: {', '.join(interests)}\nUser Current Skills: {', '.join(skills)}\n"
        
        # Add platform analysis if available
        for platform in ["github", "reddit", "youtube", "document"]:
            val = user_profile.get(platform)
            if val:
                # Handle if val is a dict containing an 'analysis' key or just a string
                text = val.get("analysis", str(val)) if isinstance(val, dict) else str(val)
                personality_context += f"\n{platform.capitalize()} Personality/Behaviors: {text[:500]}...\n"

    # Extract roadmap preferences
    prefs = roadmap_data.get("preferences", {})
    learning_style = f"Preferred Learning Style: {prefs.get('format', 'Balanced')}\nApproach: {prefs.get('approach', 'Direct')}\n"

    context_text = f"LEARNING ROADMAP FOR: {goal}\n\n"
    context_text += f"MOTIVATION: {reason}\n"
    context_text += f"{learning_style}{personality_context}\n"
    context_text += "COMMANDS & STRUCTURE:\n"
    
    for step in steps:
        context_text += f"- {step.get('title')}\n"
        for task in step.get("tasks", []):
            context_text += f"  * {task.get('title')} ({task.get('resource')})\n"
            
    # 2. Check for storage state
    storage_path = os.path.expanduser("~/.notebooklm/storage_state.json")
    if not os.path.exists(storage_path):
        raise Exception("NotebookLM not authenticated. Please run 'notebooklm auth login' in your terminal.")

    # 3. Use the client
    try:
        async with await NotebookLMClient.from_storage(timeout=120.0) as client:
            # 3.1 List existing notebooks
            try:
                notebooks = await client.notebooks.list()
            except Exception as auth_err:
                error_msg = str(auth_err)
                logger.error(f"Authentication verification failed: {error_msg}")
                if "Authentication" in error_msg or "Redirected to" in error_msg:
                    raise Exception("AUTH_REQUIRED: Your NotebookLM session has expired. Please run 'notebooklm login' in your backend terminal to re-authenticate.")
                raise Exception(f"Failed to communicate with NotebookLM. Error: {error_msg}")

            # 3.2 Find the specific notebook for this roadmap
            target_notebook = next((nb for nb in notebooks if nb.title == target_notebook_title), None)
            
            if target_notebook:
                notebook_id = target_notebook.id
                logger.info(f"📁 Reusing existing notebook: {target_notebook_title} ({notebook_id})")
                
                # Check if the requested artifact already exists in this specific notebook
                try:
                    artifacts = await client.artifacts.list(notebook_id)
                    completed_items = [a for a in artifacts if a.kind == artifact_type and a.is_completed]
                    generating_items = [a for a in artifacts if a.kind == artifact_type and not a.is_completed and not getattr(a, 'has_error', False)]
                    
                    if completed_items:
                        logger.info(f"🎉 Found existing completed {artifact_type} in notebook {notebook_id}. Downloading...")
                        if artifact_type == "audio":
                            await client.artifacts.download_audio(notebook_id, output_path)
                        else:
                            await client.artifacts.download_video(notebook_id, output_path)
                            
                        save_generation_meta(output_path, {
                            "status": "completed",
                            "completedAt": str(asyncio.get_event_loop().time())
                        })
                        return True
                        
                    elif generating_items:
                        logger.info(f"⏳ Found existing {artifact_type} that is currently generating. Waiting for it to finish...")
                        # Polling until it finishes since we might not have the original task_id to wait_for_completion
                        save_generation_meta(output_path, {"status": "generating"})
                        import time
                        poll_timeout = 1800
                        start_time = time.time()
                        
                        while time.time() - start_time < poll_timeout:
                            await asyncio.sleep(20)
                            current_artifacts = await client.artifacts.list(notebook_id)
                            completed = [a for a in current_artifacts if a.kind == artifact_type and a.is_completed]
                            if completed:
                                logger.info(f"🎉 Generating {artifact_type} completed! Downloading...")
                                if artifact_type == "audio":
                                    await client.artifacts.download_audio(notebook_id, output_path)
                                else:
                                    await client.artifacts.download_video(notebook_id, output_path)
                                    
                                save_generation_meta(output_path, {
                                    "status": "completed",
                                    "completedAt": str(asyncio.get_event_loop().time())
                                })
                                return True
                                
                            has_errors = [a for a in current_artifacts if a.kind == artifact_type and getattr(a, 'has_error', False)]
                            if has_errors:
                                raise Exception("NotebookLM artifact generation failed on server.")
                                
                        raise Exception("Timeout waiting for existing generation to complete.")
                        
                except Exception as check_err:
                    if "Timeout" in str(check_err) or "failed on server" in str(check_err):
                        raise check_err
                    logger.warning(f"Failed to check artifacts in {notebook_id}: {check_err}")
            else:
                # Create a new one specifically for this roadmap
                logger.info(f"🆕 Creating new notebook for roadmap: {target_notebook_title}")
                notebook = await client.notebooks.create(target_notebook_title)
                notebook_id = notebook.id
            
            # Save notebook metadata
            save_generation_meta(output_path, {
                "notebookId": notebook_id,
                "notebookTitle": target_notebook_title,
                "type": artifact_type,
                "status": "initializing"
            })
            
            # 3.4 Ensure roadmap source is present
            sources = await client.sources.list(notebook_id)
            if not any(s.title == "Personalized Context" for s in sources):
                await client.sources.add_text(notebook_id, title="Personalized Context", content=context_text)
            
            # 3.5 Generate the artifact with personality-driven instructions
            base_instructions = f"Custom for a user aiming to be a {goal}. Their learning style is {prefs.get('format', 'standard')} and they prefer a {prefs.get('approach', 'standard')} approach. "
            
            if artifact_type == "audio":
                instructions = (
                    f"{base_instructions} Create a deep dive podcast episode about this roadmap. "
                    "The two hosts should relate the learning steps to the user's background/personality provided in the 'Personalized Context' source. "
                    "Make it feel like a personal mentor session, using analogies that match their interests."
                )
                logger.info("Starting audio generation...")
                status = await client.artifacts.generate_audio(notebook_id, instructions=instructions)
            else:
                instructions = (
                    f"{base_instructions} Create a visual explainer video overview for this roadmap. "
                    "Focus on explaining the complex concepts simply while acknowledging the user's specific skills and learning approach. "
                    "The tone should be highly encouraging and tailored to their specific career aspiration."
                )
                logger.info("Starting video generation...")
                status = await client.artifacts.generate_video(notebook_id, instructions=instructions)
            
            # Save task metadata
            save_generation_meta(output_path, {
                "taskId": status.task_id,
                "status": "generating",
                "startedAt": str(asyncio.get_event_loop().time())
            })
            
            # Wait for completion
            await client.artifacts.wait_for_completion(notebook_id, status.task_id, timeout=1200.0)
            
            # Download result
            if artifact_type == "audio":
                await client.artifacts.download_audio(notebook_id, output_path)
            else:
                await client.artifacts.download_video(notebook_id, output_path)
            
            # Final metadata update
            save_generation_meta(output_path, {
                "status": "completed",
                "completedAt": str(asyncio.get_event_loop().time())
            })
            
            return True
    except Exception as e:
        logger.error(f"Error in generate_notebooklm_artifact ({artifact_type}): {e}")
        save_generation_meta(output_path, {
            "status": "failed",
            "error": str(e)
        })
