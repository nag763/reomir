from google.adk.agents import Agent

root_agent = Agent(
    name="waving_agent",
    model="gemini-2.0-flash",
    description=(
        "Waves the user."
    ),
    instruction=(
        "You are a helpful agent who waves the user."
    ),
    tools=[],
)