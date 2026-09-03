using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BadmintonHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddIndexesAndUserId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Waitlists_EventId",
                table: "Waitlists");

            migrationBuilder.DropIndex(
                name: "IX_Registrations_EventId",
                table: "Registrations");

            migrationBuilder.AddColumn<Guid>(
                name: "UserId",
                table: "Organizers",
                type: "TEXT",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

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

            migrationBuilder.CreateIndex(
                name: "IX_Waitlists_EventId",
                table: "Waitlists",
                column: "EventId");

            migrationBuilder.CreateIndex(
                name: "IX_Registrations_EventId",
                table: "Registrations",
                column: "EventId");
        }
    }
}
