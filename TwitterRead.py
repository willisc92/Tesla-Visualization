import json
import sys
import time
import os

class FilteredTweet:  # Class to store the clean Tweet data.
    def __init__(self, tweet_dict):
        self.user_ID = tweet_dict['user']['id_str']
        self.screen_name = tweet_dict['user']['screen_name']
        self.place_country = tweet_dict['place']['country']
        self.place_longitude = float(tweet_dict['place']['bounding_box']['coordinates'][0][0][0])
        self.place_latitude = float(tweet_dict['place']['bounding_box']['coordinates'][0][0][1])
        self.sentiment = tweet_dict['sentiment']
        self.text = tweet_dict['text']
        self.timestamp = tweet_dict['timestamp_ms']

        self.normalize_sentiment()

    def __str__(self):  # Represent the tweet as a dictionary.
        return str(self.__dict__)

    def normalize_sentiment(self):
        if self.sentiment == 2:
            self.sentiment = 1
        elif self.sentiment == 0:
            self.sentiment = -1

def filterRelevant(tweet_dict):
    if 'isRelevant' in tweet_dict:
        return tweet_dict['isRelevant'] == 1
    else:
        return False

def filterSentiment(tweet_dict):    # Filter out tweet for positive(+2) and negative(0)
    if 'sentiment' in tweet_dict:
        return (tweet_dict['sentiment'] == 0 or tweet_dict['sentiment'] == 2)
    else:
        return False

def filterTweet(tweet_dict):
    return (filterRelevant(tweet_dict) and filterSentiment(tweet_dict) and hasCountry(tweet_dict))

def hasCountry(tweet_dict):
    if tweet_dict['place'] is not None:
        return tweet_dict['place']['country'] is not None
    else:
        return False

class Logger(object):
    def __init__(self, file_name):
        self.terminal = sys.stdout
        self.log = open(file_name, "w")

    def write(self, message):
        self.terminal.write(message)
        self.log.write(message)

    def flush(self):
        # this flush method is needed for python 3 compatibility.
        # this handles the flush command by doing nothing.
        # you might want to specify some extra behavior here.
        pass


start_time = time.time()

sys.stdout = Logger("TESLA_CLEAN_TWEETS_OUTPUT_LOG.txt")
index_clean = 1
num_eval = 0 
path_to_json = "G:\\Users\\Willis\\Documents\\MENG_Software\\ENEL 645\\Visualization"
json_files = [pos_json for pos_json in os.listdir(path_to_json) if pos_json.endswith('.json')]
output_filename = "TESLA_CLEAN_TWEETS.json"  # Name of clean .json file to write to.  Will have 1 clean tweet per line of file.

print("Beginning processing...")
for js in json_files:
    with open(os.path.join(path_to_json, js), 'r', encoding='utf8', errors='ignore') as f:  # Open input file
        with open(output_filename, 'a', encoding='utf8') as outputFile:  # Open output file
            for (i, line) in enumerate(f, 1):  # Iterate through each line in input file.
                tweet_dict = json.loads(line)  # Load the .json object into a dictionary.
                num_eval += 1
                try:
                    if filterTweet(tweet_dict):  # Filter the tweet.
                        new_tweet = FilteredTweet(tweet_dict)  # Create a new filtered tweet.
                        new_tweet_json = json.dumps(
                            new_tweet.__dict__)  # Create a new json object from the clean tweet.
                        clean_tweet_json = json.dumps(new_tweet.__dict__, indent=4)
                        print(clean_tweet_json)
                        outputFile.write(new_tweet_json)  # Write the new json object to the output file.
                        outputFile.write('\n')  # Write a newline to separate tweets in output file.
                        print("Current tweets written from file:", index_clean, ", Total Tweets evaluated from file:",
                              i, ", Total Tweets read overall:", num_eval)
                        index_clean += 1
                except Exception as e:
                    print("Encountered error in line:", i)
                    print(e)
                    continue

print("****************************************")
print("Total clean tweets written from file: ", index_clean - 1)
print("Total tweets evaluated from file: ", num_eval)
end_time = time.time()
print("Time of execution in seconds:", end_time - start_time)