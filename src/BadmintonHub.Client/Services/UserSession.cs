using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Components.Server.ProtectedBrowserStorage;
using BadmintonHub.Application.DTOs;
using BadmintonHub.Domain.Entities;
using BadmintonHub.Domain.Enums;

namespace BadmintonHub.Client.Services;

public class UserSession
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly ProtectedLocalStorage _protectedLocalStorage;

    public UserSession(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        ProtectedLocalStorage protectedLocalStorage)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _protectedLocalStorage = protectedLocalStorage;
    }

    public bool IsLoggedIn => CurrentUser != null;
    public UserDto? CurrentUser { get; private set; }
    public string? Token { get; private set; }

    public event Action? OnChange;

    public async Task<bool> InitializeAsync()
    {
        try
        {
            var userIdResult = await _protectedLocalStorage.GetAsync<string>("userId");
            if (userIdResult.Success && !string.IsNullOrEmpty(userIdResult.Value))
            {
                var user = await _userManager.FindByIdAsync(userIdResult.Value);
                if (user != null && user.Status != UserStatus.Suspended)
                {
                    CurrentUser = new UserDto
                    {
                        Id = user.Id,
                        UserName = user.UserName ?? string.Empty,
                        PhoneNumber = user.PhoneNumber ?? string.Empty,
                        FullName = user.FullName,
                        Email = user.Email ?? string.Empty,
                        Role = user.Role,
                        Status = user.Status,
                        Category = user.Category,
                        WalletBalance = user.WalletBalance
                    };
                    
                    var tokenResult = await _protectedLocalStorage.GetAsync<string>("token");
                    if (tokenResult.Success)
                    {
                        Token = tokenResult.Value;
                    }

                    NotifyStateChanged();
                    return true;
                }
            }
        }
        catch
        {
            // Fail silently if storage is not ready (prerendering phase)
        }
        return false;
    }

    public async Task<bool> LoginAsync(string mobileNumber, string password)
    {
        var user = await _userManager.FindByNameAsync(mobileNumber);
        if (user == null || user.Status == UserStatus.Suspended)
        {
            return false;
        }

        var result = await _signInManager.CheckPasswordSignInAsync(user, password, false);
        if (result.Succeeded)
        {
            CurrentUser = new UserDto
            {
                Id = user.Id,
                UserName = user.UserName ?? string.Empty,
                PhoneNumber = user.PhoneNumber ?? string.Empty,
                FullName = user.FullName,
                Email = user.Email ?? string.Empty,
                Role = user.Role,
                Status = user.Status,
                Category = user.Category,
                WalletBalance = user.WalletBalance
            };

            // Fake a JWT token for front-end authentication representation in session
            Token = Guid.NewGuid().ToString();

            // Store in Protected Local Storage
            await _protectedLocalStorage.SetAsync("userId", user.Id.ToString());
            await _protectedLocalStorage.SetAsync("token", Token);
            await _protectedLocalStorage.SetAsync("role", user.Role.ToString());
            await _protectedLocalStorage.SetAsync("userName", user.FullName);

            NotifyStateChanged();
            return true;
        }

        return false;
    }

    public async Task RefreshUserAsync()
    {
        if (CurrentUser == null) return;

        var user = await _userManager.FindByIdAsync(CurrentUser.Id.ToString());
        if (user != null)
        {
            CurrentUser.WalletBalance = user.WalletBalance;
            CurrentUser.Status = user.Status;
            CurrentUser.Category = user.Category;
            CurrentUser.FullName = user.FullName;
            NotifyStateChanged();
        }
    }

    public async Task LogoutAsync()
    {
        CurrentUser = null;
        Token = null;
        try
        {
            await _protectedLocalStorage.DeleteAsync("userId");
            await _protectedLocalStorage.DeleteAsync("token");
            await _protectedLocalStorage.DeleteAsync("role");
            await _protectedLocalStorage.DeleteAsync("userName");
        }
        catch
        {
            // Ignore if called out of JS lifecycle
        }
        NotifyStateChanged();
    }

    private void NotifyStateChanged() => OnChange?.Invoke();
}
