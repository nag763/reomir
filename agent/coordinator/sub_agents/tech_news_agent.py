from feedparser import parse
from google.adk.agents import Agent, SequentialAgent


def fetch_feed(uri: str) -> dict:
    """Retrieves a RSS feed content by its URI.

    Args:
        name (str): The name or URI of the RSS feed to retrieve.
        before (datetime, optional): If provided, filter entries before this date.
        after (datetime, optional): If provided, filter entries after this date.

    Returns:
        dict: A dictionary containing the feed content or metadata.
              Includes as well a status code and message indicating on whether it was successful on retrieving the feed.
              The feed's content is in the 'entries' key, which is a list of feed entries
    """
    feed = parse(uri)
    if feed.bozo != 1:
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

        You should fetch the feed given the user's need.
        
        If the user doesn't provide an URI, infer given your knowledge on the existing technical blogs. Try to make your best to retrieve the most relevant feeds based on the user's request.
        
        Example :
            1.
                - User: What are the last announcements from Microsoft.
                - You: I will fetch the latest tech news from https://blogs.microsoft.com/feed/
            2.
                - User: I want the latest news from Google, AWS and Azure.
                - You: I will fetch the latest tech news from https://blog.google/rss/ , https://aws.amazon.com/blogs/aws/feed/ and https://azure.microsoft.com/en-us/blog/feed/
            
        If the user explictly provides an URI, use it to fetch the feed.
        
        Example :
            - User: What are the news from https://blog.google/rss/ , https://aws.amazon.com/blogs/aws/feed/ and https://azure.microsoft.com/en-us/blog/feed/
            - You: I will fetch the latest tech news from https://blog.google/rss/ , https://aws.amazon.com/blogs/aws/feed/ and https://azure.microsoft.com/en-us/blog/feed/
            
        Output *only* the content as it is fetched from the tool, without modifying of the content, enclosed in a code block (```...```).
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
        
        You should summarize each feed entries content provided by the tech_news_retriever agent.
        The summary should be concise and focused on the main points of the feed.
        You should also preserve the metadata related to the date and the source of the feed.
        The summary should include the source URI of the feed at the end of each entry.
        The date should be formatted to only include the month of the day of the entry's date.
        
        To summarize the content, focus on the description of the entry, and if it is not available, use the title of the entry
        
        
        Entry output format example :
          - entry.date entry.title  - **short summary generated** (Source: entry.link) 
        
        The data you should summarize is :
        ```
        {news_feed}
        ```
        
        Output the summarized content *only* in a code block (```...```).
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
        
        You should review the summarized feed entries provided by the tech_news_summarizer agent.
        The review should be concise and focused on the main points of the feed.
        At the end provide, the key takeaways from the feed.
        
        If some entries are not relevant, you should remove them and indicate it in your feedback.
        
        After the review, you should ask the user if he would like to either :
        * know more about a specific entry
        * find similar news in other feeds
        * or if he would like to add the feeds to a watchlist.

        Data to review:
        ```
        {news_summarized}
        ```
        
        Output the content *only* in a markdown readable format for the user.
    """
    ),
    output_key="news_reviewed",
)


tech_news_agent = SequentialAgent(
    name="tech_news_agent",
    description=("Fetch and summarize RSS feeds."),
    sub_agents=[tech_news_retriever, tech_news_summarizer, tech_news_reviewer],
)
