import re

with open('/Users/naveen/Documents/badminton_hub/src/BadmintonHub.Client/Components/Pages/Events.razor', 'r') as f:
    content = f.read()

# Replace EventCardTemplate content to include the missing vars
# We find: RenderFragment<Event> EventCardTemplate = (ev) => @<text>
# We insert the variables inside it:

vars_to_add = """
            @{
                var isFull = ev.RegisteredPlayersCount >= ev.MaxPlayers;
                var isCutoffPassed = DateTime.UtcNow >= ev.CutoffDateTime;
                var isRegistered = _myRegistrations.Contains(ev.Id);
                var isWaitlisted = _myWaitlists.Contains(ev.Id);
                var cardBorderColor = isFull ? "#F02849" : "#42B72A";
                var cardBgColor = "#FFFFFF";
                var statusBannerColor = isFull ? "#FFEBEE" : "#E8F5E9";
                var statusTextColor = isFull ? "#F02849" : "#42B72A";
            }
"""

start_str = "RenderFragment<Event> EventCardTemplate = (ev) => @<text>"
if start_str in content:
    content = content.replace(start_str, start_str + vars_to_add)

# Fix EventStatus.Closed -> EventStatus.Locked
content = content.replace("e.Status == EventStatus.Closed", "e.Status == EventStatus.Locked")
content = content.replace("e.Status == EventStatus.Pending", "e.Status == EventStatus.Full")

# Fix Illegal Attribute 'PanelClass' on 'MudTabs'
# MudTabs has `PanelClass` in some versions, but maybe it's not allowed here. Let's just remove `PanelClass="pt-6"` from MudTabs.
content = content.replace('PanelClass="pt-6"', 'Class="pt-6"')

with open('/Users/naveen/Documents/badminton_hub/src/BadmintonHub.Client/Components/Pages/Events.razor', 'w') as f:
    f.write(content)
