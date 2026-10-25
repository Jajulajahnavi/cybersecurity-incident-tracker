import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Scanner;

public class IncidentTracker {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        String url = "jdbc:mysql://localhost:3306/incident_tracker_db";

        System.out.println("========================================");
        System.out.println(" CYBERSECURITY INCIDENT TRACKER");
        System.out.println("========================================");

        System.out.print("MySQL username: ");
        String username = scanner.nextLine();

        System.out.print("MySQL password: ");
        String password = scanner.nextLine();

        System.out.print("Incident title: ");
        String title = scanner.nextLine();

        System.out.print("Incident type: ");
        String type = scanner.nextLine();

        System.out.print("Severity (Low/Medium/High/Critical): ");
        String severity = scanner.nextLine().trim().toUpperCase();

        System.out.print("Description: ");
        String description = scanner.nextLine();

        System.out.print("Affected system: ");
        String affectedSystem = scanner.nextLine();

        System.out.print("Reported by: ");
        String reportedBy = scanner.nextLine();

        String incidentCode = "INC-" +
            LocalDateTime.now().format(
                DateTimeFormatter.ofPattern("yyyyMMddHHmmss")
            );

        String sql = """
            INSERT INTO incidents
            (incident_code, title, incident_type, description,
             severity, affected_system, reported_by)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """;

        try (Connection connection =
                 DriverManager.getConnection(url, username, password);
             PreparedStatement statement =
                 connection.prepareStatement(sql)) {

            statement.setString(1, incidentCode);
            statement.setString(2, title);
            statement.setString(3, type);
            statement.setString(4, description);
            statement.setString(5, severity);
            statement.setString(6, affectedSystem);
            statement.setString(7, reportedBy);

            int rows = statement.executeUpdate();

            if (rows > 0) {
                System.out.println("\nIncident saved successfully!");
                System.out.println("Incident code: " + incidentCode);
                System.out.println("Status: REPORTED");
            }

        } catch (SQLException e) {
            System.out.println("Could not save incident to MySQL.");
            System.out.println("Reason: " + e.getMessage());
        }

        scanner.close();
    }
}