using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BadmintonHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddGuestNameToRegistrationAndWaitlist : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "GuestName",
                table: "Waitlists",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "GuestName",
                table: "Registrations",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "GuestName",
                table: "Waitlists");

            migrationBuilder.DropColumn(
                name: "GuestName",
                table: "Registrations");
        }
    }
}
