using System;
using BadmintonHub.Application.Common.Interfaces;

namespace BadmintonHub.Infrastructure.Services;

public class DateTimeService : IDateTime
{
    public DateTime Now => DateTime.Now;
}
