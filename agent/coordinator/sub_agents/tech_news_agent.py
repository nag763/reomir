from google.adk.agents import SequentialAgent, Agent

from feedparser import parse


def fetch_feed(uri: str) -> dict:
    """Retrieves a RSS feed content by its URI.

    Args:
        name (str): The name or URI of the RSS feed to retrieve.
        before (datetime, optional): If provided, filter entries before this date.
        after (datetime, optional): If provided, filter entries after this date.

    Returns:
        dict: A dictionary containing the feed content or metadata.
              Includes as well a status code and message indicating on whether it was successful on retrieving the feed.
              The feed's content is in the 'entries' key, which is a list of feed entries.

    """
    feed = parse(uri)
    if feed.bozo != 1:
        # if before:
        #     feed.entries = [entry for entry in feed.entries if datetime.datetime(*entry.published_parsed[:6]) < before]
        # if after:
        #     feed.entries = [entry for entry in feed.entries if datetime.datetime(*entry.published_parsed[:6]) > after]
        return {
            "status": "success",
            "message": f"Successfully fetched feed from {uri}",
            "entries": feed.entries,
        }
    else:
        return {
            "status": "failed",
            "message": f"Failed to fetch feed from {uri}: {feed.bozo_exception}",
        }


tech_news_retriever = Agent(
    name="tech_news_retriever",
    model="gemini-2.0-flash",
    description=("Fetch RSS feeds."),
    instruction=(
        """Your role is to fetch RSS feeds.
        
        You should retrieve the feed using the provided URI.
        
        If you are unable to retrieve a particular feed, you should ask the user to provide a valid URI for the feed.
        
        The feed must be related to tech news.
        
        Once you have retrieved the feed, you should return it in a dictionary format with the following keys:
            - status: "success" or "failed"
            - message: A message indicating whether the retrieval was successful or not
            - entries: The content of the feed, which is a list of entries.
            
        If the RSS feed can't be retrieved, return a dictionary with the status set to "failed" and a message indicating the error.
        """
    ),
    output_key="news_feed",
    tools=[fetch_feed],
)

tech_news_summarizer = Agent(
    name="tech_news_summarizer",
    model="gemini-2.0-flash",
    description=("Summarize RSS feeds."),
    instruction=(
        """Your role is to summarize RSS feeds.
        
        You should summarize the feed entries provided by the tech_news_retriever agent.
        The summary should be concise and focused on the main points of the feed.
        You should also preserve the metadata related to the date and the source of the feed.
        The summary should include the source URI of the feed at the end of each entry.
        The date should be formatted to only include the month of the day of the entry's date.
        
        Entry output format example :
          - entry.date entry.title  - **summary generated** (Source: entry.link) 
        
        The data you should summarize is :
        ```python
        {news_feed}
        ```
    """
    ),
    output_key="news_summarized",
)

tech_news_reviewer = Agent(
    name="tech_news_reviewer",
    model="gemini-2.0-flash",
    description=("Review RSS feeds."),
    instruction=(
        """Your role is to review RSS feeds.
        You should ask the user if they would like to have the feeds in their favorite list for the future.
        If so, you should add the feed to the user's favorite list.
        As well as that, if some entries are not related to technical stuff, you have to remove them.

        Data to review:
        ```python
        {news_summarized}
        ```
    """
    ),
    output_key="news_reviewed",
)


tech_news_agent = SequentialAgent(
    name="tech_news_agent",
    description=("Fetch and summarize RSS feeds."),
    sub_agents=[tech_news_retriever, tech_news_summarizer, tech_news_reviewer],
)
