from google.adk.agents import Agent

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


tech_news_agent = Agent(
    name="rss_agent",
    model="gemini-2.0-flash",
    description=("Fetch and summarize RSS feeds."),
    instruction=(
        """Your role is to fetch and summarize RSS feeds.
                 
            Once a feed is retrieved, you should extract the relevant information and summarize it.
            
            If you are unable to retrieve a particular feed, you should ask the user to provide a valid URI for the feed.
            
            It musn't be modified in any case, just summarized. As well as that the feed fetched should only be related to tech news.
                
            It is important to process in that order :
                1. Fetch the feed using the fetcher agent.
                2. Aggregate the data taking into account :
                    2.1 Metadata related to the date and the source should be preserved and included in the summary. 
                    2.2 It is important to have the source URI of the feed at the end of the entry's.
                    2.3 It is important to keep only the month of the day of the entry's date.
                    2.4 The summary should be concise and focused on the main points of the feed.
        
        Once you are done with processing the feed, you should ask if the user would like to have the feeds in his favorite list for the future, and if so, you should add the feed to the user's favorite list.
        
        If you can't achieve this, simply show the user his user id.
        """
    ),
    tools=[fetch_feed],
)
