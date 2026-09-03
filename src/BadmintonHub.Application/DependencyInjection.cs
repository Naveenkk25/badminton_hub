using System.Reflection;
using Microsoft.Extensions.DependencyInjection;
using MediatR;
using FluentValidation;
using AutoMapper;
using BadmintonHub.Application.Common.Mappings;

namespace BadmintonHub.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        var assembly = Assembly.GetExecutingAssembly();

        // Using standard AddAutoMapper extension from AutoMapper.Extensions.Microsoft.DependencyInjection
        services.AddAutoMapper(assembly);

        services.AddValidatorsFromAssembly(assembly);
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(assembly));

        return services;
    }
}
