using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BadmintonHub.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RenameEventFeeToReservedFee : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // migrationBuilder.RenameColumn(
            //     name: "EventFee",
            //     table: "Events",
            //     newName: "ReservedFee");

            // migrationBuilder.RenameColumn(
            //     name: "FeePaid",
            //     table: "Registrations",
            //     newName: "ReservedFee");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "ReservedFee",
                table: "Events",
                newName: "EventFee");

            migrationBuilder.RenameColumn(
                name: "ReservedFee",
                table: "Registrations",
                newName: "FeePaid");
        }
    }
}
