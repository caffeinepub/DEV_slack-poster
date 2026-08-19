import Array "mo:core/Array";
import Blob "mo:core/Blob";
import Char "mo:core/Char";
import Error "mo:core/Error";
import { ic } "mo:ic";
import IC "mo:ic/Types";
import Int "mo:core/Int";
import Json "mo:json";
import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Nat32 "mo:core/Nat32";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Types "../types/slack";

module {
  // Save (or overwrite) the signed-in caller's Slack bearer token.
  public func saveToken(
    state : Types.SlackSettingsState,
    caller : Principal,
    token : Text,
  ) : () {
    state.tokens.add(caller, token);
  };

  // Clear the signed-in caller's saved token.
  public func clearToken(
    state : Types.SlackSettingsState,
    caller : Principal,
  ) : () {
    state.tokens.remove(caller);
  };

  // Return the caller's saved token, or null if none is set.
  public func getToken(
    state : Types.SlackSettingsState,
    caller : Principal,
  ) : ?Text {
    state.tokens.get(caller);
  };

  // Whether the caller has a saved token.
  public func hasToken(
    state : Types.SlackSettingsState,
    caller : Principal,
  ) : Bool {
    switch (state.tokens.get(caller)) {
      case (?_) true;
      case null false;
    };
  };

  // URL-encode a single byte as %XX.
  func urlEncodeByte(b : Nat) : Text {
    let hex = "0123456789ABCDEF".toArray();
    let hi = hex[b / 16];
    let lo = hex[b % 16];
    "%" # hi.toText() # lo.toText();
  };

  // Minimal application/x-www-form-urlencoded encoder for form values.
  // Encodes every byte that is not an unreserved character (A-Z, a-z, 0-9, -, _, ., ~).
  func urlEncode(value : Text) : Text {
    let bytes : [Nat8] = value.encodeUtf8().toArray();
    let parts = bytes.map(
      func(b) {
        let n = Nat8.toNat(b);
        if ((n >= 65 and n <= 90) // A-Z
          or (n >= 97 and n <= 122) // a-z
          or (n >= 48 and n <= 57) // 0-9
          or n == 45 // -
          or n == 95 // _
          or n == 46 // .
          or n == 126) { // ~
          n.toNat32().toChar().toText();
        } else {
          urlEncodeByte(n);
        };
      },
    );
    parts.values().join("");
  };

  // Build a form-urlencoded body from a list of (field, value) pairs.
  func buildFormBody(fields : [(Text, Text)]) : Text {
    let parts = fields.map(
      func((k, v)) { urlEncode(k) # "=" # urlEncode(v) },
    );
    parts.values().join("&");
  };

  // Parse a Slack error envelope {"ok":false,"error":"..."} into a SlackError.
  func parseSlackError(json : Json.Json, code : Text) : Types.SlackError {
    let errText = switch (Json.get(json, "error")) {
      case (?(#string(e))) e;
      case _ "Unknown Slack error";
    };
    { code; message = errText };
  };

  // Fetch the caller's Slack channels via conversations.list using their saved token.
  public func listChannels(
    state : Types.SlackSettingsState,
    caller : Principal,
  ) : async Types.ListChannelsResult {
    switch (state.tokens.get(caller)) {
      case null {
        #err({
          code = "no_token";
          message = "No Slack token saved. Add your bearer token in Settings.";
        });
      };
      case (?token) {
        let url = "https://slack.com/api/conversations.list?limit=200&types=public_channel,private_channel";
        let args : IC.HttpRequestArgs = {
          url;
          method = #get;
          headers = [
            {
              name = "Authorization";
              value = "Bearer " # token;
            },
          ];
          body = null;
          max_response_bytes = ?(1_000_000 : Nat64);
          transform = null;
          is_replicated = ?false;
        };
        try {
          let res = await ic.http_request(args);
          let bodyText = switch (res.body.decodeUtf8()) {
            case (?t) t;
            case null {
              return #err({
                code = "decode_failed";
                message = "Slack response was not valid UTF-8";
              });
            };
          };
          switch (Json.parse(bodyText)) {
            case (#err(_)) {
              return #err({
                code = "parse_failed";
                message = "Slack response was not valid JSON";
              });
            };
            case (#ok(json)) {
              let ok = switch (Json.get(json, "ok")) {
                case (?(#bool(b))) b;
                case _ false;
              };
              if (not ok) {
                return #err(parseSlackError(json, "slack_error"));
              };
              let channelsJson = switch (Json.get(json, "channels")) {
                case (?(#array(arr))) arr;
                case _ {
                  return #err({
                    code = "parse_failed";
                    message = "Slack response missing channels array";
                  });
                };
              };
              let channels = channelsJson.map(
                func(ch) {
                  let id = switch (Json.get(ch, "id")) {
                    case (?(#string(s))) s;
                    case _ "";
                  };
                  let name = switch (Json.get(ch, "name")) {
                    case (?(#string(s))) s;
                    case _ "";
                  };
                  let isChannel = switch (Json.get(ch, "is_channel")) {
                    case (?(#bool(b))) b;
                    case _ false;
                  };
                  let isPrivate = switch (Json.get(ch, "is_private")) {
                    case (?(#bool(b))) b;
                    case _ false;
                  };
                  let isArchived = switch (Json.get(ch, "is_archived")) {
                    case (?(#bool(b))) b;
                    case _ false;
                  };
                  let numMembers : ?Nat = switch (Json.get(ch, "num_members")) {
                    case (?(#number(#int(n)))) {
                      if (n >= 0) { ?Int.abs(n) } else { null };
                    };
                    case _ null;
                  };
                  {
                    id;
                    name;
                    isChannel;
                    isPrivate;
                    isArchived;
                    numMembers;
                  };
                },
              );
              #ok(channels);
            };
          };
        } catch (e) {
          #err({
            code = "http_failed";
            message = "Slack request failed: " # e.message();
          });
        };
      };
    };
  };

  // Post a message to a channel via chat.postMessage using the caller's saved token.
  public func postMessage(
    state : Types.SlackSettingsState,
    caller : Principal,
    channel : Text,
    text : Text,
  ) : async Types.PostMessageResult {
    switch (state.tokens.get(caller)) {
      case null {
        #err({
          code = "no_token";
          message = "No Slack token saved. Add your bearer token in Settings.";
        });
      };
      case (?token) {
        let bodyText = buildFormBody([("channel", channel), ("text", text)]);
        let args : IC.HttpRequestArgs = {
          url = "https://slack.com/api/chat.postMessage";
          method = #post;
          headers = [
            {
              name = "Authorization";
              value = "Bearer " # token;
            },
            {
              name = "Content-Type";
              value = "application/x-www-form-urlencoded";
            },
          ];
          body = ?bodyText.encodeUtf8();
          max_response_bytes = ?(1_000_000 : Nat64);
          transform = null;
          is_replicated = ?false;
        };
        try {
          let res = await ic.http_request(args);
          let bodyText = switch (res.body.decodeUtf8()) {
            case (?t) t;
            case null {
              return #err({
                code = "decode_failed";
                message = "Slack response was not valid UTF-8";
              });
            };
          };
          switch (Json.parse(bodyText)) {
            case (#err(_)) {
              return #err({
                code = "parse_failed";
                message = "Slack response was not valid JSON";
              });
            };
            case (#ok(json)) {
              let ok = switch (Json.get(json, "ok")) {
                case (?(#bool(b))) b;
                case _ false;
              };
              if (not ok) {
                return #err(parseSlackError(json, "slack_error"));
              };
              let channelOut = switch (Json.get(json, "channel")) {
                case (?(#string(s))) s;
                case _ channel;
              };
              let ts = switch (Json.get(json, "ts")) {
                case (?(#string(s))) s;
                case _ "";
              };
              #ok({
                ok = true;
                channel = channelOut;
                ts;
                error = null;
              });
            };
          };
        } catch (e) {
          #err({
            code = "http_failed";
            message = "Slack request failed: " # e.message();
          });
        };
      };
    };
  };
};
