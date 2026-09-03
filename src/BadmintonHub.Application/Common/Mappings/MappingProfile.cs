using AutoMapper;
using BadmintonHub.Application.DTOs;
using BadmintonHub.Domain.Entities;

namespace BadmintonHub.Application.Common.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<ApplicationUser, UserDto>();
        
        CreateMap<Event, EventDto>()
            .ForMember(d => d.OrganizerName, opt => opt.MapFrom(s => s.Organizer != null ? s.Organizer.Name : "System"));
            
        CreateMap<Registration, RegistrationDto>()
            .ForMember(d => d.EventName, opt => opt.MapFrom(s => s.Event != null ? s.Event.Name : string.Empty))
            .ForMember(d => d.PlayerName, opt => opt.MapFrom(s => !string.IsNullOrEmpty(s.GuestName) ? s.GuestName : (s.Player != null ? s.Player.FullName : string.Empty)))
            .ForMember(d => d.PlayerMobile, opt => opt.MapFrom(s => s.Player != null ? s.Player.PhoneNumber : string.Empty))
            .ForMember(d => d.PlayerCategory, opt => opt.MapFrom(s => !string.IsNullOrEmpty(s.GuestName) ? "Guest" : (s.Player != null && s.Player.Category != null ? s.Player.Category.ToString() : string.Empty)));

        CreateMap<Waitlist, WaitlistDto>()
            .ForMember(d => d.EventName, opt => opt.MapFrom(s => s.Event != null ? s.Event.Name : string.Empty))
            .ForMember(d => d.PlayerName, opt => opt.MapFrom(s => !string.IsNullOrEmpty(s.GuestName) ? s.GuestName : (s.Player != null ? s.Player.FullName : string.Empty)))
            .ForMember(d => d.PlayerMobile, opt => opt.MapFrom(s => s.Player != null ? s.Player.PhoneNumber : string.Empty))
            .ForMember(d => d.PlayerCategory, opt => opt.MapFrom(s => !string.IsNullOrEmpty(s.GuestName) ? "Guest" : (s.Player != null && s.Player.Category != null ? s.Player.Category.ToString() : string.Empty)));

        CreateMap<WalletTransaction, WalletTransactionDto>()
            .ForMember(d => d.PlayerName, opt => opt.MapFrom(s => s.Player != null ? s.Player.FullName : string.Empty));

        CreateMap<ActivityLog, ActivityLogDto>()
            .ForMember(d => d.UserFullName, opt => opt.MapFrom(s => s.User != null ? s.User.FullName : "System"))
            .ForMember(d => d.UserRole, opt => opt.MapFrom(s => s.User != null ? s.User.Role.ToString() : "System"))
            .ForMember(d => d.EventName, opt => opt.MapFrom(s => s.Event != null ? s.Event.Name : null));

        CreateMap<AuditLog, AuditLogDto>()
            .ForMember(d => d.UserFullName, opt => opt.MapFrom(s => s.User != null ? s.User.FullName : "System"));
    }
}
