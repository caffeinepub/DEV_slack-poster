import AccessControl "mo:caffeineai-authorization/access-control";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import Expose "mo:caffeineai-oql/Expose";
import OQL "mo:caffeineai-oql";
import RecordValue "mo:caffeineai-oql/RecordValue";
import PrincipalValue "mo:caffeineai-oql/PrincipalValue";
import TextValue "mo:caffeineai-oql/TextValue";
import Map "mo:core/Map";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import Types "types/slack";
import MixinSlackApi "mixins/slack-api";

actor {
  let accessControlState : AccessControl.AccessControlState;
  include MixinAuthorization(accessControlState, null);

  let slackSettingsState : Types.SlackSettingsState;
  include MixinSlackApi(slackSettingsState);

  // Row shape for the per-user Slack token entity. The owner (Principal) lives
  // in the Map key, so we promote it as the `user` field; the token text is the
  // Map value. Both fields are primitives with built-in _toRow, so the entity
  // auto-derives.
  type SlackTokenRow = {
    user : Principal;
    token : Text;
  };

  // scopedIter: returns only the caller's rows when given ?p, all rows when null
  // (used for schema seeding). This keeps the scan O(user rows) for scoped reads.
  func tokenScopedIter(caller : ?Principal) : Iter.Iter<SlackTokenRow> {
    switch (caller) {
      case (?p) {
        // Only this user's row, if any.
        switch (slackSettingsState.tokens.get(p)) {
          case (?t) [{ user = p; token = t }].vals();
          case null [].vals();
        };
      };
      case null {
        // All rows — used for schema seeding only, never served to a scoped caller.
        slackSettingsState.tokens.entries().map(
          func ((k, v)) = { user = k; token = v },
        );
      };
    };
  };

  include Expose({
    entities = [
      // Per-user Slack bearer tokens. Strictly private: each signed-in user
      // reads only their own row; the agent is scoped too (cannot read others'
      // tokens). The `user` field is both the primary key and the owner column.
      OQL.Entity.build(
        OQL.Entity.scopedPerUser(
          OQL.Entity.ownedBy(
            OQL.Entity.sample(
              OQL.Entity.newScoped<SlackTokenRow>(
                "slackToken",
                tokenScopedIter,
                "SlackTokenRow",
                "user",
              ),
              { user = Principal.fromText("aaaaa-aa"); token = "" },
            ),
            "user",
          ),
        ),
      ),
    ];
  });
};
