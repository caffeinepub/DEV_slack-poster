import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  // A Slack channel returned by conversations.list.
  public type SlackChannel = {
    id : Text;
    name : Text;
    isChannel : Bool;
    isPrivate : Bool;
    isArchived : Bool;
    numMembers : ?Nat;
  };

  // Result of posting a message via chat.postMessage.
  public type SlackPostResult = {
    ok : Bool;
    channel : Text;
    ts : Text;
    error : ?Text;
  };

  // Error surfaced to the frontend for any Slack operation.
  public type SlackError = {
    code : Text;
    message : Text;
  };

  // Outcome of listing channels.
  public type ListChannelsResult = {
    #ok : [SlackChannel];
    #err : SlackError;
  };

  // Outcome of posting a message.
  public type PostMessageResult = {
    #ok : SlackPostResult;
    #err : SlackError;
  };

  // Per-user Slack settings state shape passed to mixins.
  // Each signed-in user stores their own bearer token, keyed by principal,
  // so the token is never re-pasted across sessions.
  public type SlackSettingsState = {
    var tokens : Map.Map<Principal, Text>;
  };
};
