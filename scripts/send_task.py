#!/usr/bin/env python3
"""
Task Sender Script

This script sends tasks to the FlowMaestro orchestrator for a specific project.
It creates JSON task files in the project's messaging directory.
"""

import argparse
import json
import uuid
from datetime import datetime
from pathlib import Path
import sys
from typing import Optional, Dict, Any

sys.path.append(str(Path(__file__).parent.parent))
from orchestrator.utils.config_loader import load_config_by_project_name

def create_task_json(
    project: str,
    role: str,
    description: str,
    payload_file: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a task JSON structure.
    
    Args:
        project: Project name
        role: Target role (architect, builder, etc.)
        description: Task description
        payload_file: Optional JSON file with detailed payload
        
    Returns:
        Task dictionary
    """
    task_id = str(uuid.uuid4())
    timestamp = datetime.utcnow().isoformat()
    
    task = {
        "task_id": task_id,
        "timestamp": timestamp,
        "from": "user",
        "to": role,
        "type": "request",
        "project": project,
        "payload": {
            "description": description
        }
    }
    
    # If payload file provided, merge it with task
    if payload_file:
        with open(payload_file, "r") as f:
            payload = json.load(f)
            task["payload"].update(payload)
    
    return task

def send_task(
    project: str,
    role: str,
    description: str,
    payload_file: Optional[str] = None,
    config_dir: str = "config"
) -> str:
    """
    Send a task to the orchestrator.
    
    Args:
        project: Project name
        role: Target role
        description: Task description
        payload_file: Optional JSON file with detailed payload
        config_dir: Directory containing project configs
        
    Returns:
        Task ID
        
    Raises:
        FileNotFoundError: If config not found
        ValueError: If role is invalid
    """
    # Load project config
    config = load_config_by_project_name(project, config_dir)
    
    # Validate role
    enabled_roles = config.get("enabled_roles", [])
    if role not in enabled_roles:
        roles_str = ", ".join(enabled_roles)
        raise ValueError(f"Invalid role '{role}'. Must be one of: {roles_str}")
    
    # Create task JSON
    task = create_task_json(project, role, description, payload_file)
    
    # Determine task file path
    tasks_dir = Path(config["messaging"]["base_dir"]) / "tasks"
    task_file = tasks_dir / f"{task['task_id']}.json"
    
    # Ensure directory exists
    tasks_dir.mkdir(parents=True, exist_ok=True)
    
    # Write task file
    with open(task_file, "w") as f:
        json.dump(task, f, indent=2)
        
    return task["task_id"]

def main():
    """CLI interface."""
    parser = argparse.ArgumentParser(description="Send task to FlowMaestro orchestrator")
    
    parser.add_argument(
        "--project",
        required=True,
        help="Project name (must match config file name)"
    )
    
    parser.add_argument(
        "--role",
        required=True,
        help="Target role (architect, builder, etc.)"
    )
    
    parser.add_argument(
        "--description",
        required=True,
        help="Task description"
    )
    
    parser.add_argument(
        "--payload-file",
        help="JSON file with additional payload data"
    )
    
    parser.add_argument(
        "--config-dir",
        default="config",
        help="Directory containing project configs"
    )
    
    args = parser.parse_args()
    
    try:
        task_id = send_task(
            args.project,
            args.role,
            args.description,
            args.payload_file,
            args.config_dir
        )
        
        print(f"Task {task_id} enqueued for role {args.role} in project {args.project}")
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
