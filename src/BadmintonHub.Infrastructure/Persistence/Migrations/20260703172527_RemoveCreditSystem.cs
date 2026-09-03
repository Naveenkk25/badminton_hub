using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BadmintonHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RemoveCreditSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OrganizerCreditTransactions");

            migrationBuilder.DropIndex(
                name: "IX_Waitlists_EventId",
                table: "Waitlists");

            migrationBuilder.DropIndex(
                name: "IX_Registrations_EventId",
                table: "Registrations");

            migrationBuilder.DropColumn(
                name: "CreditsRemaining",
                table: "Organizers");

            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "Organizers",
                type: "TEXT",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<string>(
                name: "RefreshToken",
                table: "AspNetUsers",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RefreshTokenExpiryTime",
                table: "AspNetUsers",
                type: "TEXT",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Waitlists_EventId_PlayerId",
                table: "Waitlists",
                columns: new[] { "EventId", "PlayerId" },
                unique: true,
                filter: "IsCancelled = 0 AND IsPromoted = 0 AND IsDeleted = 0");

            migrationBuilder.CreateIndex(
                name: "IX_Registrations_EventId_PlayerId",
                table: "Registrations",
                columns: new[] { "EventId", "PlayerId" },
                unique: true,
                filter: "IsCancelled = 0 AND IsDeleted = 0");

            migrationBuilder.CreateIndex(
                name: "IX_Organizers_UserId",
                table: "Organizers",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Organizers_AspNetUsers_UserId",
                table: "Organizers",
                column: "UserId",
                principalTable: "AspNetUsers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Organizers_AspNetUsers_UserId",
                table: "Organizers");

            migrationBuilder.DropIndex(
                name: "IX_Waitlists_EventId_PlayerId",
                table: "Waitlists");

            migrationBuilder.DropIndex(
                name: "IX_Registrations_EventId_PlayerId",
                table: "Registrations");

            migrationBuilder.DropIndex(
                name: "IX_Organizers_UserId",
                table: "Organizers");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Organizers");

            migrationBuilder.DropColumn(
                name: "RefreshToken",
                table: "AspNetUsers");

            migrationBuilder.DropColumn(
                name: "RefreshTokenExpiryTime",
                table: "AspNetUsers");

            migrationBuilder.AddColumn<int>(
                name: "CreditsRemaining",
                table: "Organizers",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "OrganizerCreditTransactions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    OrganizerId = table.Column<Guid>(type: "TEXT", nullable: false),
                    CreatedBy = table.Column<string>(type: "TEXT", nullable: false),
                    CreatedDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreditsChanged = table.Column<int>(type: "INTEGER", nullable: false),
                    DeletedBy = table.Column<string>(type: "TEXT", nullable: true),
                    DeletedDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Description = table.Column<string>(type: "TEXT", nullable: false),
                    IsDeleted = table.Column<bool>(type: "INTEGER", nullable: false),
                    ModifiedBy = table.Column<string>(type: "TEXT", nullable: true),
                    ModifiedDate = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Timestamp = table.Column<DateTime>(type: "TEXT", nullable: false),
                    Type = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrganizerCreditTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrganizerCreditTransactions_Organizers_OrganizerId",
                        column: x => x.OrganizerId,
                        principalTable: "Organizers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Waitlists_EventId",
                table: "Waitlists",
                column: "EventId");

            migrationBuilder.CreateIndex(
                name: "IX_Registrations_EventId",
                table: "Registrations",
                column: "EventId");

            migrationBuilder.CreateIndex(
                name: "IX_OrganizerCreditTransactions_OrganizerId",
                table: "OrganizerCreditTransactions",
                column: "OrganizerId");
        }
    }
}
