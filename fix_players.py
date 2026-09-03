import re

with open('/Users/naveen/Documents/badminton_hub/src/BadmintonHub.Client/Components/Pages/Players.razor', 'r') as f:
    content = f.read()

# Replace the Actions cell
actions_start = content.find('<MudTd DataLabel="Actions">')
actions_end = content.find('</MudTd>', actions_start) + len('</MudTd>')

new_actions = """<MudTd DataLabel="Actions">
                        <MudMenu Label="Actions" EndIcon="@Icons.Material.Filled.KeyboardArrowDown" Size="Size.Small" Variant="Variant.Outlined" AnchorOrigin="Origin.BottomRight" TransformOrigin="Origin.TopRight">
                            <MudMenuItem OnClick="() => OpenEditPlayerDialog(context)" Icon="@Icons.Material.Filled.Edit">Edit Player</MudMenuItem>
                            <MudMenuItem OnClick="() => OpenCreditWalletDialog(context)" Icon="@Icons.Material.Filled.AccountBalanceWallet">Credit Wallet</MudMenuItem>
                            <MudMenuItem OnClick="() => OpenUpdateCategoryDialog(context)" Icon="@Icons.Material.Filled.Category">Change Category</MudMenuItem>
                            
                            @if (context.Status == UserStatus.Active)
                            {
                                <MudMenuItem OnClick="() => ToggleSuspend(context, true)" Icon="@Icons.Material.Filled.Block" Style="color: orange;">Mark Inactive</MudMenuItem>
                            }
                            else
                            {
                                <MudMenuItem OnClick="() => ToggleSuspend(context, false)" Icon="@Icons.Material.Filled.CheckCircle" Style="color: green;">Make Active</MudMenuItem>
                            }
                            
                            <MudMenuItem OnClick="() => ResetPassword(context)" Icon="@Icons.Material.Filled.LockReset">Reset Password</MudMenuItem>
                            <MudMenuItem OnClick="async () => await ViewPlayerHistory(context)" Icon="@Icons.Material.Filled.History">View History</MudMenuItem>
                            
                            @if (Session.CurrentUser?.Role == UserRole.SuperAdmin)
                            {
                                <MudDivider />
                                <MudMenuItem OnClick="() => DeletePlayer(context)" Icon="@Icons.Material.Filled.Delete" Style="color: red;">Delete Player</MudMenuItem>
                            }
                        </MudMenu>
                    </MudTd>"""

content = content[:actions_start] + new_actions + content[actions_end:]

# Update the status chip text
chip_start = content.find('<MudChip T="string" Color="@(context.Status == BadmintonHub.Domain.Enums.UserStatus.Active ? Color.Success : Color.Warning)" Size="Size.Small">')
chip_end = content.find('</MudChip>', chip_start)

new_chip_content = """<MudChip T="string" Color="@(context.Status == BadmintonHub.Domain.Enums.UserStatus.Active ? Color.Success : Color.Warning)" Size="Size.Small">
                            @(context.Status == BadmintonHub.Domain.Enums.UserStatus.Active ? "Active" : context.Status == BadmintonHub.Domain.Enums.UserStatus.PendingActivation ? "Pending Activation" : "Inactive")
                        """
content = content[:chip_start] + new_chip_content + content[chip_end:]

# Update ToggleSuspend method strings
content = content.replace('"Player Suspended"', '"Player Marked Inactive"')
content = content.replace('"Player Activated"', '"Player Marked Active"')
content = content.replace('"Player account suspended."', '"Player account marked inactive."')
content = content.replace('"Player account activated."', '"Player account marked active."')
content = content.replace('suspend ? "Player Suspended" : "Player Activated"', 'suspend ? "Player Marked Inactive" : "Player Marked Active"')
content = content.replace('suspend ? "Player account suspended." : "Player account activated."', 'suspend ? "Player account marked inactive." : "Player account marked active."')

with open('/Users/naveen/Documents/badminton_hub/src/BadmintonHub.Client/Components/Pages/Players.razor', 'w') as f:
    f.write(content)
