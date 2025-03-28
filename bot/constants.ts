export const CONTAINER = "the-circass-🎪";
export const GENERAL = "general-foolery";

export const TEAMS = ["Hearts", "Diamonds", "Spades", "Clubs"];

export const teamChannelName = (team: string) => `team-${team.toLowerCase()}`;
export const teamRoleName = (team: string) => `Team ${team}`;
export const teamSymbol = (team: string) => {
  switch (team) {
    case "Hearts":
      return "♥️";
    case "Diamonds":
      return "♦️";
    case "Spades":
      return "♠️";
    case "Clubs":
      return "♣️";
  }
  return "❓";
};
