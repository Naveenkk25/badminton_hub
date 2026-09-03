using BadmintonHub.Client.Components;
using MudBlazor.Services;
using BadmintonHub.Application;
using BadmintonHub.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorComponents()
    .AddInteractiveServerComponents();

// Register MudBlazor services
builder.Services.AddMudServices();
builder.Services.AddScoped<BadmintonHub.Client.Services.UserSession>();

// Add Application and Infrastructure services
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);

var app = builder.Build();

// Migrate and seed database
using (var scope = app.Services.CreateScope())
{
    var initializer = scope.ServiceProvider.GetRequiredService<BadmintonHub.Infrastructure.Persistence.ApplicationDbContextInitializer>();
    await initializer.InitialiseAsync();
    await initializer.SeedAsync();
}

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    app.UseHsts();
}

app.UseHttpsRedirection();

app.UseStaticFiles();
app.UseAntiforgery();

app.MapRazorComponents<App>()
    .AddInteractiveServerRenderMode();

app.Run();
