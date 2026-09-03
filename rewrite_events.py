import re

with open('/Users/naveen/Documents/badminton_hub/src/BadmintonHub.Client/Components/Pages/Events.razor', 'r') as f:
    content = f.read()

# Replace MudGrid with Tabs and EventCardTemplate
grid_start = content.find('<!-- Event Cards Grid -->')
grid_end = content.find('</MudGrid>', grid_start) + len('</MudGrid>')

grid_content = content[grid_start:grid_end]

# Extract the body of the loop
loop_start = grid_content.find('{', grid_content.find('@foreach')) + 1
loop_end = grid_content.rfind('}')

loop_body = grid_content[loop_start:loop_end].strip()

# Replace MudItem classes for layout and padding
loop_body = loop_body.replace('<MudItem xs="12" md="6" lg="4">', '<MudItem xs="12" sm="6" lg="6">')
loop_body = loop_body.replace('<MudCardContent>', '<MudCardContent Class="pa-3">')
loop_body = loop_body.replace('mb-4 pa-2', 'mb-2 pa-2')
loop_body = loop_body.replace('my-3', 'my-2')
loop_body = loop_body.replace('mb-4', 'mb-2')
loop_body = loop_body.replace('pa-4 pt-0', 'pa-3 pt-0')

template = """
    <!-- Event Tabs -->
    @{
        RenderFragment<Event> EventCardTemplate = (ev) => @<text>
            """ + loop_body.replace('\n', '\n            ') + """
        </text>;
    }

    <MudTabs Elevation="2" Rounded="true" ApplyEffectsToContainer="true" PanelClass="pt-6">
        <MudTabPanel Text="Active Events">
            <MudGrid>
                @foreach (var ev in _eventsList.Where(e => e.Status == EventStatus.Open))
                {
                    @EventCardTemplate(ev)
                }
            </MudGrid>
        </MudTabPanel>
        <MudTabPanel Text="Completed Events">
            <MudGrid>
                @foreach (var ev in _eventsList.Where(e => e.Status == EventStatus.Completed || e.Status == EventStatus.Closed || e.Status == EventStatus.Cancelled || e.Status == EventStatus.Locked))
                {
                    @EventCardTemplate(ev)
                }
            </MudGrid>
        </MudTabPanel>
    </MudTabs>
"""

new_content = content[:grid_start] + template.strip() + '\n' + content[grid_end:]

# Replace time options
new_content = new_content.replace('Enumerable.Range(0, 48).Select(i => (TimeSpan?)TimeSpan.FromMinutes(30 * i)).ToList()', 'Enumerable.Range(0, 96).Select(i => (TimeSpan?)TimeSpan.FromMinutes(15 * i)).ToList()')

with open('/Users/naveen/Documents/badminton_hub/src/BadmintonHub.Client/Components/Pages/Events.razor', 'w') as f:
    f.write(new_content)
