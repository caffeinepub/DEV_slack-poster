import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  // Inlined from mo:caffeineai-authorization/access-control (migrations must
  // be self-contained — only mo:core imports allowed).
  public type UserRole = {
    #admin;
    #user;
    #guest;
  };

  public type AccessControlState = {
    var adminAssigned : Bool;
    userRoles : Map.Map<Principal, UserRole>;
  };

  // First migration: introduces stable state for the first time.
  // OldActor = {} because the deployed .most baseline shows an empty actor.
  type OldActor = {};
  type NewActor = {
    accessControlState : AccessControlState;
    slackSettingsState : {
      var tokens : Map.Map<Principal, Text>;
    };
  };

  public func migration(_old : OldActor) : NewActor {
    {
      accessControlState = {
        var adminAssigned = false;
        userRoles = Map.empty();
      };
      slackSettingsState = {
        var tokens = Map.empty();
      };
    };
  };
};
