import { Text, StyleSheet } from "react-native";
import { tokens } from "../../styles/tokens";

export default function TextField({ label, children, size = "md", weight = "regular", color = "black", align = "left", numberOfLines, selectable = false, style, ...props }) {

    const textColor = tokens.colors[color] || tokens.palette.gray[color] || color;

    return (
        <Text
            {...props}
            selectable={selectable}
            numberOfLines={numberOfLines}
            style={[
                styles.text,
                {
                    fontSize: tokens.fontSize[size] ?? tokens.fontSize.md,
                    fontFamily: tokens.fontWeight[weight] ?? tokens.fontWeight.regular,
                    color: textColor,
                    textAlign: align
                },
                style
            ]}
        >
            {children ?? label}
        </Text>
    );
}

const styles = StyleSheet.create({
    text: {
        includeFontPadding: false
    }
});