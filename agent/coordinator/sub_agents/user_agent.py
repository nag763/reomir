from typing import Optional

from google.adk.agents import Agent
from google.adk.agents.callback_context import CallbackContext
from google.adk.tools import ToolContext
from google.adk.tools.agent_tool import AgentTool
from google.cloud import firestore
from google.genai import types


def check_if_agent_should_run(
    callback_context: CallbackContext,
) -> Optional[types.Content]:
    # Please google review my PR https://github.com/google/adk-python/pull/1083
    callback_context.state["user:id"] = callback_context._invocation_context.user_id


def get_user_profile_metadata(tool_context: ToolContext) -> dict:
    """Retrieves the 'metadata' field from a user's profile by user ID.
    Returns:
        dict: A dictionary containing:
              - "status": "success" or "not_found" or "error".
              - "user_id": The ID of the user.
              - "metadata": The user's metadata dictionary if found, else None.
              - "message": An optional message, e.g., for errors.
    """
    try:

        user_id = tool_context.state.get("user:id")
        if not user_id:
            return {
                "status": "error",
                "user_id": None,
                "metadata": None,
                "message": "User ID not available in tool_context.",
            }

        db = firestore.Client()
        doc_ref = db.collection("users").document(user_id)
        doc = doc_ref.get()

        if doc.exists:
            user_data = doc.to_dict()
            metadata = user_data.get("metadata")  # Get only the metadata field
            if metadata is not None:
                return {"status": "success", "user_id": user_id, "metadata": metadata}
            else:
                return {
                    "status": "not_found",  # Metadata field itself is missing
                    "user_id": user_id,
                    "metadata": None,
                    "message": f"User '{user_id}' found, but 'metadata' field is missing or null.",
                }
        else:
            return {
                "status": "not_found",  # User document not found
                "user_id": user_id,
                "metadata": None,
                "message": f"User with ID '{user_id}' not found.",
            }
    except Exception as e:
        print(f"Error in get_user_profile_metadata: {e}")  # Basic logging
        return {
            "status": "error",
            "user_id": getattr(tool_context._invocation_context, "user_id", "Unknown"),
            "metadata": None,
            "message": str(e),
        }


def modify_user_profile_metadata(new_metadata: dict, tool_context: ToolContext) -> dict:
    """Modifies/Overwrites the 'metadata' field of a user's profile by user ID.
    Creates the user document or 'metadata' field if they don't exist.

    Args:
        new_metadata (dict): A dictionary containing the new user metadata content.

    Returns:
        dict: A dictionary containing:
              - "status": "success" or "error".
              - "user_id": The ID of the user.
              - "updated_metadata": The new metadata if successful.
              - "message": An optional message.
    """
    try:

        # NOTE: Accessing _invocation_context.user_id is an internal detail.
        user_id = tool_context.state.get("user:id")
        if not user_id:
            return {
                "status": "error",
                "user_id": None,
                "updated_metadata": None,
                "message": "User ID not available in tool_context.",
            }

        db = firestore.Client()
        doc_ref = db.collection("users").document(user_id)

        # This will create the document if it doesn't exist,
        # and create/overwrite the metadata field within it.
        # Other top-level fields in the document will not be affected if they exist.
        doc_ref.set({"metadata": new_metadata}, merge=True)

        return {
            "status": "success",
            "user_id": user_id,
            "updated_metadata": new_metadata,
            "message": f"Metadata for user '{user_id}' updated successfully.",
        }
    except Exception as e:
        print(f"Error in modify_user_profile_metadata: {e}")  # Basic logging
        return {
            "status": "error",
            "user_id": getattr(tool_context._invocation_context, "user_id", "Unknown"),
            "updated_metadata": None,
            "message": str(e),
        }


user_retriever = Agent(
    name="user_retriever",
    model="gemini-2.0-flash",  # Specify a current and appropriate model
    description=("Retrieve user profile metadata."),
    instruction=(
        """Your primary role is to retrieve the 'metadata' field from a user's profile.
        
        You *must* use the `get_user_profile_metadata` tool for this purpose.
        
        The tool will return a dictionary. Inspect its 'status' field:
        - If 'status' is 'success', the user's metadata is in the 'metadata' field of the tool's output. Present *only* this metadata, in a JSON formatted code block.
          Example:
          ```json
          { "theme": "dark", "preferences": { "notifications": "on" } }
          ```
        - If 'status' is 'not_found', state clearly that the user's metadata was not found (e.g., "User metadata not found.").
        - If 'status' is 'error', state that an error occurred and include the message from the tool's output (e.g., "An error occurred: [error message from tool].").
        
        Do not add conversational fluff. Directly relay the outcome based on the tool's response.
        """
    ),
    tools=[get_user_profile_metadata],
    output_key="result",
)

user_modifier = Agent(
    name="user_modifier",
    model="gemini-2.0-flash",
    description=("Modify user profile metadata."),
    instruction=(
        """Your primary role is to modify the 'metadata' field of a user's profile.
        You *must* use the `modify_user_profile_metadata` tool.
        
        The user will provide the new metadata content. You must pass this content as the `new_metadata` argument to the tool.
        The `modify_user_profile_metadata` tool expects the *entire new state* of the 'metadata' field. It will overwrite any existing metadata with what you provide.
        The tool also handles creating the user or metadata field if they don't exist.
        
        After the tool call, inspect its 'status' field:
        - If 'status' is 'success', the metadata was updated. The 'updated_metadata' field in the tool's output contains the new metadata. Present a brief confirmation and then *only* this updated metadata, in a JSON formatted code block.
          Example:
          "User metadata updated successfully:
          ```json
          { "theme": "light", "preferences": { "notifications": "off" } }
          ```"
        - If 'status' is 'error', state that an error occurred and include the message from the tool's output (e.g., "An error occurred during modification: [error message from tool].").

        Do *not* attempt to modify fields like `user_id`, `uid`, `email`, `cookie_consent`, or `created_at`. These are outside the 'metadata' scope handled by this tool.
        Focus on constructing the correct `new_metadata` object based on the user's request and passing it to the tool.
        """
    ),
    tools=[modify_user_profile_metadata],
    output_key="result",
)

user_agent = Agent(
    name="user_agent",
    model="gemini-2.0-flash",
    description=("Manages user profile metadata by retrieving or modifying it."),
    instruction=(
        """You are a user profile assistant for managing profile 'metadata'.
        You have two sub-agents:
        1. `user_retriever`: To fetch current profile metadata.
        2. `user_modifier`: To change, update, or set profile metadata.

        **Workflow:**
        1.  Determine if the user wants to get metadata (retrieve) or change metadata (modify).
        2.  Delegate to the appropriate sub-agent.

        In any case, you should not store PII informations.
        For instances, all of the below informations should not be stored :
        * First and last names
        * Sexuality preferences
        * Physical attributes
        * Medical records
        And anything else that would fall in the category of physical or social information.
        
        Content that can be harmful shouldn't be stored in any case either.

        **Handling Sub-Agent Results (available in their 'result' output key):**
        
        If `user_retriever` was called:
        -   Its 'result' will be the retrieved metadata (in a code block) or a 'not found'/'error' message. Present this 'result' directly to the user.
            Example for success: "Your profile indicates you like Google and Cloud technologies."
            Example for not found: "I couldn't find your profile metadata."

        If `user_modifier` was called:
        -   Its 'result' will be a confirmation with the updated metadata (in a code block) or an 'error' message. Present this 'result' directly to the user.
            Never refer to the term metadata explicitely, instead refer to his profile.
            Example for success: "Your preferences have been updated indicating you like Google"
            Example for error: "An error occurred while updating your metadata: [error message]."

        **Critical Note for Modifying Metadata:**
        The `user_modifier` sub-agent (and its underlying tool) expects the *entire, complete* `new_metadata` object.
        -   If the user provides the full metadata structure they want to set, pass it to `user_modifier`.
        -   If the user asks for a *partial update* (e.g., "change my theme to 'dark'" but doesn't specify other metadata like 'notifications'), you *must first* use `user_retriever` to get the current full metadata. Then, incorporate the user's requested change into this retrieved metadata to create the complete `new_metadata` object. Finally, pass this complete object to `user_modifier`. If retrieval fails or no metadata exists, you may need to inform the user or construct a new metadata object based only on their partial input if that's the desired behavior for new users.

        Your primary goal is to orchestrate these sub-agents effectively.
        Be concise. Only use the provided tools.
        Try to not show explicit applicative data such as json or yaml outputs, instead explain the modifications you performed on the profile or the data you can see in a textual manner.
        """
    ),
    tools=[
        AgentTool(agent=user_retriever),
        AgentTool(agent=user_modifier),
    ],
    before_agent_callback=check_if_agent_should_run,
)
