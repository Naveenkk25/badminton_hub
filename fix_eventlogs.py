import re

with open('/Users/naveen/Documents/badminton_hub/src/BadmintonHub.Client/Components/Pages/EventLogs.razor', 'r') as f:
    content = f.read()

# Replace OnInitializedAsync
old_init = """    protected override async Task OnInitializedAsync()
    {
        if (!Session.IsLoggedIn || (Session.CurrentUser?.Role != UserRole.SuperAdmin && Session.CurrentUser?.Role != UserRole.Organizer))
        {
            Navigation.NavigateTo("/dashboard");
            return;
        }

        try
        {
            _loading = true;
            using var scope = appServices.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
            // Fetch logs that relate specifically to Events registrations/creations/cancellations, wallet transactions, credit usage
            _activityLogs = await db.ActivityLogs
                .Include(a => a.User)
                .Where(a => a.Action.Contains("Event") || a.Action.Contains("Registration") || a.Action.Contains("Waitlist") || 
                            a.Action.Contains("Booked") || a.Action.Contains("Wallet") || a.Action.Contains("Credit") ||
                            a.Description.Contains("event") || a.Description.Contains("Event") || a.Description.Contains("credit") || 
                            a.Description.Contains("Credit") || a.Description.Contains("wallet") || a.Description.Contains("Wallet"))
                .OrderByDescending(a => a.Timestamp)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error loading event logs: {ex.Message}");
        }
        finally
        {
            _loading = false;
        }
    }"""

new_init = """    protected override async Task OnInitializedAsync()
    {
        if (!Session.IsLoggedIn || (Session.CurrentUser?.Role != UserRole.SuperAdmin && Session.CurrentUser?.Role != UserRole.Organizer))
        {
            Navigation.NavigateTo("/dashboard");
            return;
        }

        try
        {
            _loading = true;
            using var scope = appServices.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
            
            var query = db.ActivityLogs
                .Include(a => a.User)
                .Include(a => a.Event)
                .Where(a => a.Action.Contains("Event") || a.Action.Contains("Registration") || a.Action.Contains("Waitlist") || 
                            a.Action.Contains("Booked") || a.Action.Contains("Wallet") || a.Action.Contains("Credit") ||
                            a.Description.Contains("event") || a.Description.Contains("Event") || a.Description.Contains("credit") || 
                            a.Description.Contains("Credit") || a.Description.Contains("wallet") || a.Description.Contains("Wallet"));

            if (Session.CurrentUser?.Role == UserRole.Organizer)
            {
                var org = await db.Organizers.FirstOrDefaultAsync(o => o.ContactNumber == Session.CurrentUser.PhoneNumber);
                if (org != null)
                {
                    var orgId = org.Id;
                    var currentUserId = Session.CurrentUser.Id;
                    query = query.Where(a => a.UserId == currentUserId || (a.Event != null && a.Event.OrganizerId == orgId));
                }
                else
                {
                    // Fallback to only their own user actions if org record missing
                    var currentUserId = Session.CurrentUser.Id;
                    query = query.Where(a => a.UserId == currentUserId);
                }
            }

            _activityLogs = await query.OrderByDescending(a => a.Timestamp).ToListAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error loading event logs: {ex.Message}");
        }
        finally
        {
            _loading = false;
        }
    }"""

content = content.replace(old_init, new_init)

with open('/Users/naveen/Documents/badminton_hub/src/BadmintonHub.Client/Components/Pages/EventLogs.razor', 'w') as f:
    f.write(content)
