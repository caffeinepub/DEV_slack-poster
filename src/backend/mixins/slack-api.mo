import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Types "../types/slack";
import SlackLib "../lib/slack";

mixin (
  slackSettingsState : Types.SlackSettingsState,
) {
  // Save (or overwrite) the signed-in caller's Slack bearer token.
  public shared ({ caller }) func saveSlackToken(token : Text) : async () {
    if (caller.isAnonymous()) Runtime.trap("Sign in required");
    SlackLib.saveToken(slackSettingsState, caller, token);
  };

  // Clear the signed-in caller's saved token.
  public shared ({ caller }) func clearSlackToken() : async () {
    if (caller.isAnonymous()) Runtime.trap("Sign in required");
    SlackLib.clearToken(slackSettingsState, caller);
  };

  // Whether the signed-in caller has a saved Slack token.
  public query ({ caller }) func hasSlackToken() : async Bool {
    if (caller.isAnonymous()) Runtime.trap("Sign in required");
    SlackLib.hasToken(slackSettingsState, caller);
  };

  // List the signed-in caller's Slack channels via conversations.list.
  public shared ({ caller }) func listSlackChannels() : async Types.ListChannelsResult {
    if (caller.isAnonymous()) Runtime.trap("Sign in required");
    await SlackLib.listChannels(slackSettingsState, caller);
  };

  // Post a message to a Slack channel via chat.postMessage.
  public shared ({ caller }) func postSlackMessage(
    channel : Text,
    text : Text,
  ) : async Types.PostMessageResult {
    if (caller.isAnonymous()) Runtime.trap("Sign in required");
    await SlackLib.postMessage(slackSettingsState, caller, channel, text);
  };
};
