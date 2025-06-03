"""This module defines a simple waving agent using the Google ADK.

The agent is configured to greet the user with a wave.
"""

from google.adk.agents import Agent

from .sub_agents.tech_news_agent import tech_news_agent
from .sub_agents.user_agent import user_agent

root_agent = Agent(
    name="coordinator",
    model="gemini-2.0-flash",
    description=("Coordinate the actions of other agents."),
    instruction=("Your role is to delegate the actions to other agents"),
    tools=[],
    sub_agents=[tech_news_agent, user_agent],
)
